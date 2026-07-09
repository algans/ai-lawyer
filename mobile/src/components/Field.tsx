import { View, Text, TextInput, StyleSheet, type KeyboardTypeOptions } from "react-native";
import { renk, radius, fontAilesi } from "../lib/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences";
};

export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
}: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={renk.faint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fontAilesi.govdeKalin, fontSize: 14, color: renk.ink, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: renk.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontAilesi.govde,
    fontSize: 16,
    color: renk.ink,
    backgroundColor: renk.white,
  },
});
