import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { renk, fontAilesi } from "../lib/theme";
import { useAuth } from "../lib/auth";
import GreenHeader from "../components/GreenHeader";
import Field from "../components/Field";
import Button from "../components/Button";
import Banner from "../components/Banner";

export default function Kayit() {
  const router = useRouter();
  const { kayitOl } = useAuth();
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder() {
    if (parola.length < 6) {
      setHata("Parola en az 6 karakter olmalı.");
      return;
    }
    setBusy(true);
    setHata(null);
    try {
      await kayitOl(email.trim(), parola, ad.trim() || undefined);
      router.back();
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Kayıt başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Kayıt Ol" altMetin="Birkaç saniyede hesap oluşturun." />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        <View style={s.card}>
          <Field label="Ad (opsiyonel)" value={ad} onChangeText={setAd} placeholder="Adınız" autoCapitalize="sentences" />
          <Field label="E-posta" value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" />
          <Field label="Parola" value={parola} onChangeText={setParola} placeholder="En az 6 karakter" secureTextEntry />
          <Button label="Kayıt Ol" onPress={gonder} busy={busy} disabled={!email || !parola} />
        </View>
        <Text style={s.alt}>
          Zaten hesabınız var mı?{" "}
          <Text style={s.link} onPress={() => router.replace("/giris")}>
            Giriş yapın
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 18, padding: 18 },
  alt: { textAlign: "center", marginTop: 16, fontFamily: fontAilesi.govde, fontSize: 14, color: renk.muted },
  link: { color: renk.green600, fontFamily: fontAilesi.govdeKalin },
});
