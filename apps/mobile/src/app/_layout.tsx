import "@/i18n";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { Appearance, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  KeyboardController,
  KeyboardProvider,
} from "react-native-keyboard-controller";

Appearance.setColorScheme("light");

const RootLayout = () => {
  useEffect(() => {
    KeyboardController.preload();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search-destination" />
          <Stack.Screen name="search-results" />
          <Stack.Screen name="trip/[id]" />
        </Stack>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default RootLayout;
