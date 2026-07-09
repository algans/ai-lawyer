import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";

export default function Banner({ tur, mesaj }: { tur: "error" | "warn"; mesaj: string }) {
  const hata = tur === "error";
  return (
    <View style={[s.wrap, { backgroundColor: hata ? renk.errorBg : renk.draftBg }]}>
      <Feather name={hata ? "alert-circle" : "alert-triangle"} size={18} color={hata ? renk.error : renk.draftInk} />
      <Text style={[s.text, { color: hata ? renk.errorInk : renk.draftInk }]}>{mesaj}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 13,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  text: { flex: 1, fontFamily: fontAilesi.govde, fontSize: 13.5, lineHeight: 20 },
});
