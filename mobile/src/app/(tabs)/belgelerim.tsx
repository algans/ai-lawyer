import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { renk, fontAilesi } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";
import type { Case, CasesYanit } from "../../lib/types";
import GreenHeader from "../../components/GreenHeader";
import Button from "../../components/Button";
import Banner from "../../components/Banner";

export default function Belgelerim() {
  const router = useRouter();
  const { girisYapildi, token } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!token) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const d = await apiFetch<CasesYanit>("/api/cases", { token });
      setCases(d.cases);
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Belgeler yüklenemedi.");
    } finally {
      setYukleniyor(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (girisYapildi) yukle();
    }, [girisYapildi, yukle])
  );

  if (!girisYapildi) {
    return (
      <View style={{ flex: 1, backgroundColor: renk.bg }}>
        <GreenHeader baslik="Belgelerim" />
        <View style={{ padding: 18 }}>
          <Text style={s.bos}>Belgelerinizi görmek için giriş yapın.</Text>
          <Button label="Giriş Yap" onPress={() => router.push("/giris")} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Belgelerim" />
      {hata && (
        <View style={{ padding: 16 }}>
          <Banner tur="error" mesaj={hata} />
        </View>
      )}
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={cases}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={yukle} />}
        ListEmptyComponent={
          !yukleniyor ? <Text style={s.bos}>Henüz belgeniz yok. Sohbet sekmesinden başlayın.</Text> : null
        }
        renderItem={({ item }) => {
          const belge = item.documents[0];
          return (
            <View style={s.kart}>
              <Text style={s.baslik} numberOfLines={1}>
                {item.baslik}
              </Text>
              <Text style={s.kategori}>{item.kategori}</Text>
              {belge && (
                <View style={[s.rozet, belge.durum === "odendi" ? s.rozetOdendi : s.rozetTaslak]}>
                  <Text style={[s.rozetText, { color: belge.durum === "odendi" ? renk.success : renk.draftInk }]}>
                    {belge.durum === "odendi" ? "Ödendi" : "Taslak"}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  bos: { fontFamily: fontAilesi.govde, fontSize: 15, color: renk.muted, marginBottom: 16, lineHeight: 22 },
  kart: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  baslik: { fontFamily: fontAilesi.govdeKalin, fontSize: 15, color: renk.ink },
  kategori: { fontFamily: fontAilesi.govde, fontSize: 13, color: renk.muted, marginTop: 3 },
  rozet: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 10 },
  rozetOdendi: { backgroundColor: renk.successBg },
  rozetTaslak: { backgroundColor: renk.draftBg },
  rozetText: { fontFamily: fontAilesi.govdeKalin, fontSize: 11 },
});
