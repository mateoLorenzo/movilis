import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ChevronLeftIcon from "@/assets/svg/chevron-left.svg";
import NavigationIcon from "@/assets/svg/navigation.svg";
import SearchIcon from "@/assets/svg/search.svg";
import XIcon from "@/assets/svg/x.svg";
import { SuggestionRow } from "@/screens/search-destination/components/SuggestionRow";
import { mockDestinations } from "@/screens/search-destination/constants";
import type { Destination } from "@/screens/search-destination/interfaces";
import { useSearchStore } from "@/store/search.store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const SearchDestination = () => {
  const { t } = useTranslation();
  const { back } = useRouter();
  const origin = useSearchStore((state) => state.origin);
  const setDestination = useSearchStore((state) => state.setDestination);
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) {
      return mockDestinations;
    }
    return mockDestinations.filter((destination) =>
      normalize(`${destination.name} ${destination.province}`).includes(
        normalizedQuery,
      ),
    );
  }, [query]);

  const handleSelect = (destination: Destination) => {
    setDestination(destination.name);
    back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
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
      </View>

      <View style={styles.fields}>
        <View style={styles.originPill}>
          <NavigationIcon
            width={18}
            height={18}
            color={colors.neutral.textPrimary}
          />
          <Text style={styles.originText}>{origin}</Text>
        </View>

        <View style={styles.searchPill}>
          <SearchIcon
            width={18}
            height={18}
            color={colors.neutral.textPrimary}
          />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor={colors.neutral.textSecondary}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t("home.searchPlaceholder")}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("searchDestination.clear")}
            >
              <View style={styles.clearButton}>
                <XIcon
                  width={12}
                  height={12}
                  color={colors.neutral.textPrimary}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.listContainer}>
        {suggestions.length > 0 ? (
          <FlashList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SuggestionRow destination={item} onPress={handleSelect} />
            )}
            ListHeaderComponent={
              query.trim().length === 0 ? (
                <Text style={styles.listLabel}>
                  {t("searchDestination.popular")}
                </Text>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <Text style={styles.noMatches}>
            {t("searchDestination.noMatches", { query: query.trim() })}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fields: {
    gap: 12,
    marginHorizontal: 24,
  },
  originPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 58,
    borderRadius: 999,
    paddingHorizontal: 22,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  originText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 58,
    borderRadius: 999,
    paddingHorizontal: 22,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.textPrimary,
  },
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.neutral.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    flex: 1,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  listLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
    paddingTop: 12,
    paddingBottom: 8,
  },
  noMatches: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
  },
});

export default SearchDestination;
