import { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { renk, fontAilesi } from "../../lib/theme";
import { getOnizleme } from "../../lib/preview-cache";
import { useAuth } from "../../lib/auth";
import { odemeBaslat, belgeDurumu, belgeIndir } from "../../lib/odeme";
import GreenHeader from "../../components/GreenHeader";
import DocPreview from "../../components/DocPreview";
import PaywallSheet from "../../components/PaywallSheet";
import Banner from "../../components/Banner";
import Button from "../../components/Button";

const FIYAT = 99;

export default function OnizlemeEkrani() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const onizleme = documentId ? getOnizleme(documentId) : undefined;

  const [sheetAcik, setSheetAcik] = useState(false);
  const [busy, setBusy] = useState(false);
  const [odendi, setOdendi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function odeVeIndir() {
    if (!documentId) return;
    if (!token) {
      setSheetAcik(false);
      router.push("/giris");
      return;
    }
    setBusy(true);
    setHata(null);
    try {
      await odemeBaslat(documentId, token);
      const durum = await belgeDurumu(documentId, token);
      if (durum === "odendi") {
        setOdendi(true);
        setSheetAcik(false);
      } else {
        setHata("Ödeme tamamlanmadı görünüyor. Ödeme yaptıysanız birkaç saniye sonra tekrar deneyin.");
      }
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Ödeme başlatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function indir(format: "pdf" | "docx") {
    if (!documentId || !token) return;
    setBusy(true);
    setHata(null);
    try {
      await belgeIndir(documentId, format, token);
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Belge indirilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader
        baslik="Önizleme"
        sol={
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={renk.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        {onizleme ? (
          <DocPreview onizleme={onizleme} />
        ) : (
          <Banner tur="warn" mesaj="Önizleme bulunamadı. Lütfen sohbete dönüp belgeyi yeniden oluşturun." />
        )}
        {odendi ? (
          <View style={s.odendiKart}>
            <Text style={s.odendiBaslik}>Ödeme alındı — belgeniz hazır</Text>
            <Button label="PDF indir" onPress={() => indir("pdf")} busy={busy} />
            <Button label="Word (DOCX) indir" variant="ghost" onPress={() => indir("docx")} busy={busy} style={{ marginTop: 8 }} />
          </View>
        ) : (
          onizleme && (
            <Button
              label={`Web'de öde ve indir — ${FIYAT} TL`}
              onPress={() => setSheetAcik(true)}
              style={{ marginTop: 16 }}
            />
          )
        )}
      </ScrollView>
      <PaywallSheet gorunur={sheetAcik} fiyat={FIYAT} busy={busy} onOde={odeVeIndir} onKapat={() => setSheetAcik(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  odendiKart: { backgroundColor: renk.successBg, borderRadius: 16, padding: 18, marginTop: 16 },
  odendiBaslik: {
    fontFamily: fontAilesi.govdeKalin,
    fontSize: 15,
    color: renk.success,
    marginBottom: 14,
    textAlign: "center",
  },
});
