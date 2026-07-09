import { Stack } from "expo-router";

// Geçici kök layout (Task 8'de fontlar + AuthProvider ile değiştirilecek).
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
