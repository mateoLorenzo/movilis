import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import type { DevListVariant } from "@/store/dev.store";
import { useDevMocksStore } from "@/store/dev.store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const NEXT_TRIP_OPTIONS: { label: string; value: boolean }[] = [
  { label: "With next trip", value: true },
  { label: "Without next trip", value: false },
];

const FAVORITES_OPTIONS: { label: string; value: DevListVariant }[] = [
  { label: "Empty", value: "empty" },
  { label: "One chip", value: "one" },
  { label: "Many chips", value: "many" },
];

const TRIPS_OPTIONS: { label: string; value: DevListVariant }[] = [
  { label: "Empty", value: "empty" },
  { label: "One trip", value: "one" },
  { label: "Many trips", value: "many" },
];

interface DevMenuProps {
  bottomOffset?: number;
}

interface ChipSectionProps<Value> {
  label: string;
  options: { label: string; value: Value }[];
  selected: Value;
  onSelect: (value: Value) => void;
}

const ChipSection = <Value extends string | boolean>({
  label,
  options,
  selected,
  onSelect,
}: ChipSectionProps<Value>) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{label}</Text>
    <View style={styles.chips}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <TouchableOpacity
            key={option.label}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const DevMenu = ({ bottomOffset = 16 }: DevMenuProps) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  const hasNextTrip = useDevMocksStore((state) => state.hasNextTrip);
  const setHasNextTrip = useDevMocksStore((state) => state.setHasNextTrip);
  const favoritesVariant = useDevMocksStore((state) => state.favoritesVariant);
  const setFavoritesVariant = useDevMocksStore(
    (state) => state.setFavoritesVariant,
  );
  const tripsVariant = useDevMocksStore((state) => state.tripsVariant);
  const setTripsVariant = useDevMocksStore((state) => state.setTripsVariant);

  if (!__DEV__) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { bottom: insets.bottom + bottomOffset }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Dev tools"
      >
        <Text style={styles.triggerLabel}>DEV</Text>
      </TouchableOpacity>

      <BottomSheetModal visible={visible} onDismiss={() => setVisible(false)}>
        <Text style={styles.title}>Dev tools</Text>

        <ChipSection
          label="Next trip section"
          options={NEXT_TRIP_OPTIONS}
          selected={hasNextTrip}
          onSelect={setHasNextTrip}
        />

        <ChipSection
          label="Favorite destinations"
          options={FAVORITES_OPTIONS}
          selected={favoritesVariant}
          onSelect={setFavoritesVariant}
        />

        <ChipSection
          label="Trips to destinations"
          options={TRIPS_OPTIONS}
          selected={tripsVariant}
          onSelect={setTripsVariant}
        />
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral.textPrimary,
    opacity: 0.75,
  },
  triggerLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.accent.onAccent,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    color: colors.neutral.textPrimary,
    textAlign: "center",
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.surfaceSubtle,
  },
  chipSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  chipLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  chipLabelSelected: {
    color: colors.accent.onAccent,
  },
});

export { DevMenu };
