import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface InitialsAvatarProps {
  initials: string;
  size?: number;
  fontSize?: number;
}

const InitialsAvatar = ({
  initials,
  size = 44,
  fontSize = 14,
}: InitialsAvatarProps) => (
  <View
    style={[
      styles.container,
      { width: size, height: size, borderRadius: size / 2 },
    ]}
  >
    <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: fonts.bold,
    color: colors.neutral.textSecondary,
  },
});

export { InitialsAvatar };
