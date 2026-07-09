import { View, Text } from "react-native";

// Geçici giriş ekranı (Task 8/9'da (tabs) grubuna taşınacak).
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6F9F7" }}>
      <Text style={{ fontSize: 18, color: "#0F1E17" }}>Hukuki Asistan</Text>
    </View>
  );
}
