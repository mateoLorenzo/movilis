import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CalendarIcon from "@/assets/svg/calendar.svg";
import ChevronDownIcon from "@/assets/svg/chevron-down.svg";
import ChevronLeftIcon from "@/assets/svg/chevron-left.svg";
import NavigationIcon from "@/assets/svg/navigation.svg";
import SearchIcon from "@/assets/svg/search.svg";
import SlidersHorizontalIcon from "@/assets/svg/sliders-horizontal.svg";
import { TripRow } from "@/components/TripRow";
import {
  buildMockResults,
  mockResultFilters,
} from "@/screens/search-results/constants";
import { useSearchStore } from "@/store/search.store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface FilterChipProps {
  icon: typeof CalendarIcon;
  label: string;
}

const FilterChip = ({ icon: Icon, label }: FilterChipProps) => (
  <TouchableOpacity
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.filterChip}>
      <Icon width={14} height={14} color={colors.neutral.textPrimary} />
      <Text style={styles.filterChipText}>{label}</Text>
      <ChevronDownIcon
        width={14}
        height={14}
        color={colors.neutral.textSecondary}
      />
    </View>
  </TouchableOpacity>
);

const SearchResults = () => {
  const { t } = useTranslation();
  const { back } = useRouter();
  const origin = useSearchStore((state) => state.origin);
  const destination = useSearchStore((state) => state.destination);

  const results = useMemo(
    () => buildMockResults(destination ?? ""),
    [destination],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={back}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("searchDestination.back")}
        >
          <View style={styles.backButton}>
            <ChevronLeftIcon
              width={24}
              height={24}
              color={colors.neutral.textPrimary}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={back}
          activeOpacity={0.8}
          style={styles.summaryPillWrapper}
          accessibilityRole="button"
          accessibilityLabel={destination ?? t("home.searchPlaceholder")}
        >
          <View style={styles.summaryPill}>
            <SearchIcon
              width={16}
              height={16}
              color={colors.neutral.textPrimary}
            />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryDestination}>
                {destination ?? t("home.searchPlaceholder")}
              </Text>
              <Text style={styles.summaryFrom}>
                {t("searchResults.from", { address: origin })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("searchResults.filters")}
        >
          <View style={styles.filtersButton}>
            <SlidersHorizontalIcon
              width={17}
              height={17}
              color={colors.neutral.textPrimary}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.filterChips}>
        <FilterChip icon={CalendarIcon} label={mockResultFilters.dateLabel} />
        <FilterChip
          icon={NavigationIcon}
          label={t("searchResults.upToKm", { km: mockResultFilters.maxKm })}
        />
      </View>

      <Text style={styles.count}>
        {t("searchResults.count", { count: results.length })}
      </Text>

      <FlashList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripRow trip={item} />}
        ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
    paddingLeft: 16,
    paddingRight: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPillWrapper: {
    flex: 1,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 54,
    borderRadius: 999,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  summaryCol: {
    gap: 1,
  },
  summaryDestination: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  summaryFrom: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  filtersButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  filterChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
});

export default SearchResults;
