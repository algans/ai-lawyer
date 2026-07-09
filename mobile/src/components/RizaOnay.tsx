import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";
import { API_URL } from "../lib/config";
import Button from "./Button";

export default function RizaOnay({ onOnayla, busy }: { onOnayla: () => void; busy: boolean }) {
  const [kabul, setKabul] = useState(false);
  return (
    <View style={s.card}>
      <Pressable style={s.row} onPress={() => setKabul((k) => !k)}>
        <View style={[s.check, kabul && s.checkOn]}>
          {kabul && <Feather name="check" size={14} color={renk.white} />}
        </View>
        <Text style={s.text}>
          <Text style={s.link} onPress={() => Linking.openURL(`${API_URL}/kvkk`)}>
            KVKK aydınlatma metni
          </Text>{" "}
          ve sorumluluk reddini okudum, kabul ediyorum.
        </Text>
      </Pressable>
      <Button
        label={busy ? "Belgeniz hazırlanıyor..." : "Belgeyi Oluştur"}
        onPress={onOnayla}
        disabled={!kabul}
        busy={busy}
        style={{ marginTop: 16 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: renk.white,
    borderWidth: 1,
    borderColor: renk.border,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 18,
  },
  row: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#C3D3CA",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: renk.green600, borderColor: renk.green600 },
  text: { flex: 1, fontFamily: fontAilesi.govde, fontSize: 14.5, lineHeight: 21, color: "#3F524A" },
  link: { color: renk.green600, fontFamily: fontAilesi.govdeKalin },
});
