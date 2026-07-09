import { useEffect, useRef } from "react";
import { Modal, View, Text, Pressable, Animated, StyleSheet, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { renk, fontAilesi } from "../lib/theme";
import Button from "./Button";

type Props = {
  gorunur: boolean;
  fiyat: number;
  busy: boolean;
  onOde: () => void;
  onKapat: () => void;
};

export default function PaywallSheet({ gorunur, fiyat, busy, onOde, onKapat }: Props) {
  const y = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  useEffect(() => {
    Animated.timing(y, {
      toValue: gorunur ? 0 : Dimensions.get("window").height,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [gorunur, y]);

  return (
    <Modal visible={gorunur} transparent animationType="fade" onRequestClose={onKapat}>
      <Pressable style={s.backdrop} onPress={onKapat} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: y }] }]}>
        <View style={s.grab} />
        <View style={s.badge}>
          <Feather name="lock" size={20} color={renk.green800} />
        </View>
        <Text style={s.title}>Belgenin tamamı hazır</Text>
        <Text style={s.sub}>Ödemeyi tamamlayın, belgenizi PDF ve Word olarak indirin.</Text>
        <Button label={`Web'de öde ve indir — ${fiyat} TL`} onPress={onOde} busy={busy} />
        <Button label="Daha sonra" variant="ghost" onPress={onKapat} style={{ marginTop: 8 }} />
        <View style={s.guven}>
          <Feather name="shield" size={13} color={renk.muted} />
          <Text style={s.guvenText}>Güvenli ödeme · iyzico / Stripe</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,20,15,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: renk.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
  },
  grab: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#D9E4DE", alignSelf: "center", marginBottom: 16 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: renk.mint,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  title: { fontFamily: fontAilesi.govdeKalin, fontSize: 16, color: renk.ink, textAlign: "center", marginBottom: 4 },
  sub: {
    fontFamily: fontAilesi.govde,
    fontSize: 13.5,
    color: renk.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  guven: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", marginTop: 12 },
  guvenText: { fontFamily: fontAilesi.govde, fontSize: 12.5, color: renk.muted },
});
