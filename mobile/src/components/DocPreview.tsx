import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";

export default function DocPreview({ onizleme }: { onizleme: string }) {
  return (
    <View>
      <View style={s.head}>
        <Text style={s.title}>Önizleme</Text>
        <View style={s.pill}>
          <Feather name="lock" size={12} color={renk.draftInk} />
          <Text style={s.pillText}>Taslak — kilitli</Text>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.body}>{onizleme}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontFamily: fontAilesi.baslik, fontSize: 22, color: renk.ink },
  pill: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    backgroundColor: renk.draftBg,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontFamily: fontAilesi.govdeKalin, fontSize: 11, color: renk.draftInk },
  card: {
    backgroundColor: renk.white,
    borderWidth: 1,
    borderColor: renk.border,
    borderRadius: radius.lg,
    padding: 16,
  },
  body: { fontFamily: fontAilesi.govde, fontSize: 13.5, lineHeight: 21, color: "#2A3A33" },
});
