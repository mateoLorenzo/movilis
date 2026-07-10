import "@/i18n";

import { Stack } from "expo-router";
import { Appearance, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

Appearance.setColorScheme("light");

const RootLayout = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search-destination" />
        <Stack.Screen name="search-results" />
      </Stack>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default RootLayout;
