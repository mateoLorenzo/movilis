import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import MapPinIcon from "@/assets/svg/map-pin.svg";
import type { Destination } from "@/screens/search-destination/interfaces";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface SuggestionRowProps {
  destination: Destination;
  onPress: (destination: Destination) => void;
}

const SuggestionRow = ({ destination, onPress }: SuggestionRowProps) => (
  <TouchableOpacity
    onPress={() => onPress(destination)}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${destination.name}, ${destination.province}`}
  >
    <View style={styles.row}>
      <View style={styles.iconTile}>
        <MapPinIcon
          width={22}
          height={22}
          color={colors.neutral.textPrimary}
        />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.name}>{destination.name}</Text>
        <Text style={styles.province}>{destination.province}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.neutral.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  province: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
});

export { SuggestionRow };
