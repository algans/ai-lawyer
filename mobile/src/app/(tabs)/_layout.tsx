import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { renk, fontAilesi } from "../../lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: renk.green600,
        tabBarInactiveTintColor: renk.faint,
        tabBarLabelStyle: { fontFamily: fontAilesi.govdeKalin, fontSize: 11 },
        tabBarStyle: { backgroundColor: renk.white, borderTopColor: renk.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Sohbet", tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="belgelerim"
        options={{ title: "Belgelerim", tabBarIcon: ({ color, size }) => <Feather name="file-text" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="hesap"
        options={{ title: "Hesap", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
