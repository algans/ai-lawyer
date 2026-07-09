import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import { renk, radius, fontAilesi } from "../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "ghost";
  style?: ViewStyle;
};

export default function Button({ label, onPress, disabled, busy, variant = "primary", style }: Props) {
  const ghost = variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        s.base,
        ghost ? s.ghost : s.primary,
        (disabled || busy) && s.disabled,
        pressed && !disabled && !busy ? { opacity: 0.9 } : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={ghost ? renk.green700 : renk.white} />
      ) : (
        <Text style={[s.label, ghost ? s.labelGhost : s.labelPrimary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    flexDirection: "row",
  },
  primary: { backgroundColor: renk.green600 },
  ghost: { backgroundColor: renk.white, borderWidth: 1, borderColor: renk.border },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fontAilesi.govdeKalin, fontSize: 16 },
  labelPrimary: { color: renk.white },
  labelGhost: { color: renk.green800 },
});
