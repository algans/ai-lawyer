import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { renk, fontAilesi } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import GreenHeader from "../../components/GreenHeader";
import Button from "../../components/Button";

export default function Hesap() {
  const router = useRouter();
  const { girisYapildi, cikisYap } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: renk.bg }}>
      <GreenHeader baslik="Hesabım" />
      <View style={{ padding: 18 }}>
        {girisYapildi ? (
          <View style={s.card}>
            <Text style={s.durum}>Giriş yapıldı.</Text>
            <Button label="Çıkış Yap" variant="ghost" onPress={cikisYap} />
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.durum}>Belgelerinizi kaydetmek ve ödemek için giriş yapın.</Text>
            <Button label="Giriş Yap" onPress={() => router.push("/giris")} />
            <Button label="Kayıt Ol" variant="ghost" onPress={() => router.push("/kayit")} style={{ marginTop: 8 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border, borderRadius: 18, padding: 20 },
  durum: { fontFamily: fontAilesi.govde, fontSize: 15, color: renk.muted, marginBottom: 16, lineHeight: 22 },
});
