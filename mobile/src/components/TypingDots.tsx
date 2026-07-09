import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, radius } from "../lib/theme";

function Dot({ gecikme }: { gecikme: number }) {
  const o = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 400, delay: gecikme, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [o, gecikme]);
  return <Animated.View style={[s.dot, { opacity: o }]} />;
}

export default function TypingDots() {
  return (
    <View style={s.row}>
      <View style={s.avatar}>
        <Feather name="feather" size={15} color={renk.white} />
      </View>
      <View style={s.bubble}>
        <Dot gecikme={0} />
        <Dot gecikme={200} />
        <Dot gecikme={400} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginVertical: 6 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: renk.green800,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: renk.white,
    borderWidth: 1,
    borderColor: renk.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: renk.green500 },
});
