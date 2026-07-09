import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { renk, fontAilesi } from "../lib/theme";
import { useAuth } from "../lib/auth";
import GreenHeader from "../components/GreenHeader";
import Field from "../components/Field";
import Button from "../components/Button";
import Banner from "../components/Banner";

export default function Giris() {
  const router = useRouter();
  const { girisYap } = useAuth();
  const [email, setEmail] = useState("");
  const [parola, setParola] = useState("");
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function gonder() {
    setBusy(true);
    setHata(null);
    try {
      await girisYap(email.trim(), parola);
      router.back();
    } catch (e) {
      setHata((e as { message?: string })?.message ?? "Giriş başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Giriş Yap" altMetin="Belgelerinize ulaşmak için giriş yapın." />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        {hata && <Banner tur="error" mesaj={hata} />}
        <View style={s.card}>
          <Field label="E-posta" value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" />
          <Field label="Parola" value={parola} onChangeText={setParola} placeholder="••••••••" secureTextEntry />
          <Button label="Giriş Yap" onPress={gonder} busy={busy} disabled={!email || !parola} />
        </View>
        <Text style={s.alt}>
          Hesabınız yok mu?{" "}
          <Text style={s.link} onPress={() => router.replace("/kayit")}>
            Kayıt olun
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
