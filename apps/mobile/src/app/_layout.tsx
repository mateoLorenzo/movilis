import "@/i18n";

import { Stack } from "expo-router";
import { Appearance } from "react-native";

Appearance.setColorScheme("light");

const RootLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="search-destination" />
    </Stack>
  );
};

export default RootLayout;
