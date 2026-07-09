import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius, fontAilesi } from "../lib/theme";
import type { Msg } from "../lib/types";

export default function ChatBubble({ rol, icerik }: Msg) {
  if (rol === "user") {
    return (
      <View style={s.userRow}>
        <View style={s.userBubble}>
          <Text style={s.userText}>{icerik}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={s.aiRow}>
      <View style={s.avatar}>
        <Feather name="feather" size={15} color={renk.white} />
      </View>
      <View style={s.aiBubble}>
        <Text style={s.aiText}>{icerik}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  userRow: { flexDirection: "row", justifyContent: "flex-end", marginVertical: 6 },
  aiRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginVertical: 6 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: renk.green800,
    alignItems: "center",
    justifyContent: "center",
  },
  userBubble: {
    maxWidth: "82%",
    backgroundColor: renk.green600,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  aiBubble: {
    maxWidth: "82%",
    backgroundColor: renk.mintBg,
    borderWidth: 1,
    borderColor: "#D8E8DF",
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  userText: { color: renk.white, fontFamily: fontAilesi.govde, fontSize: 15, lineHeight: 22 },
  aiText: { color: "#24352D", fontFamily: fontAilesi.govde, fontSize: 15, lineHeight: 22 },
});
