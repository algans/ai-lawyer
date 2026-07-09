import type { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { renk, fontAilesi } from "../lib/theme";

type Props = { baslik: string; altMetin?: string; sol?: ReactNode; sag?: ReactNode };

export default function GreenHeader({ baslik, altMetin, sol, sag }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: renk.green900 }}>
      <View style={s.wrap}>
        {sol || sag ? (
          <View style={s.row}>
            <View>{sol}</View>
            <View>{sag}</View>
          </View>
        ) : null}
        <Text style={s.baslik}>{baslik}</Text>
        {altMetin ? <Text style={s.alt}>{altMetin}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: renk.green900,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: renk.gold,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  baslik: { fontFamily: fontAilesi.baslik, fontSize: 22, color: renk.white },
  alt: { fontFamily: fontAilesi.govde, fontSize: 13, color: "#BCD3C9", marginTop: 3 },
});
