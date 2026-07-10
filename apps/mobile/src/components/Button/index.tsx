import type { GestureResponderEvent } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface ButtonProps {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
}

const GradientFill = () => (
  <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <LinearGradient id="buttonGradient" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor={colors.accent.gradientStart} />
        <Stop offset="1" stopColor={colors.accent.gradientEnd} />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill="url(#buttonGradient)" />
  </Svg>
);

const Button = ({ label, onPress, disabled }: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled ?? false }}
    >
      <View style={[styles.container, disabled && styles.disabled]}>
        <GradientFill />
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.accent.onAccent,
  },
});

export { Button };
