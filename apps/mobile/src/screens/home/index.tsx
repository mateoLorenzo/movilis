import { useRouter } from "expo-router";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import BellIcon from "@/assets/svg/bell.svg";
import CarNavigationIcon from "@/assets/svg/car-navigation.svg";
import MapPinIcon from "@/assets/svg/map-pin.svg";
import NavigationIcon from "@/assets/svg/navigation.svg";
import PlusIcon from "@/assets/svg/plus.svg";
import SearchIcon from "@/assets/svg/search.svg";
import { Button } from "@/components/Button";
import { DevMenu } from "@/components/DevMenu";
import { InitialsAvatar } from "@/screens/home/components/InitialsAvatar";
import { NextTripCard } from "@/screens/home/components/NextTripCard";
import { TabBar } from "@/screens/home/components/TabBar";
import { TripRow } from "@/screens/home/components/TripRow";
import {
  mockFavoriteDestinations,
  mockNextTrip,
  mockTrips,
  mockUser,
} from "@/screens/home/constants";
import { useDevMocksStore } from "@/store/dev.store";
import { useSearchStore } from "@/store/search.store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface SearchPillProps {
  icon: FC<SvgProps>;
  text: string;
  isPlaceholder?: boolean;
  onPress?: () => void;
}

const SearchPill = ({
  icon: Icon,
  text,
  isPlaceholder,
  onPress,
}: SearchPillProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={text}
  >
    <View style={styles.searchPill}>
      <Icon width={18} height={18} color={colors.neutral.textPrimary} />
      <Text
        style={[styles.searchPillText, isPlaceholder && styles.placeholderText]}
      >
        {text}
      </Text>
    </View>
  </TouchableOpacity>
);

interface DestinationChipProps {
  label: string;
}

const DestinationChip = ({ label }: DestinationChipProps) => (
  <TouchableOpacity
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.chip}>
      <MapPinIcon width={14} height={14} color={colors.neutral.textPrimary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const Home = () => {
  const { t } = useTranslation();
  const { push } = useRouter();
  const origin = useSearchStore((state) => state.origin);
  const destination = useSearchStore((state) => state.destination);
  const hasNextTrip = useDevMocksStore((state) => state.hasNextTrip);
  const favoritesVariant = useDevMocksStore((state) => state.favoritesVariant);
  const tripsVariant = useDevMocksStore((state) => state.tripsVariant);

  const favoriteDestinations =
    favoritesVariant === "empty"
      ? []
      : favoritesVariant === "one"
        ? mockFavoriteDestinations.slice(0, 1)
        : mockFavoriteDestinations;

  const trips =
    tripsVariant === "empty"
      ? []
      : tripsVariant === "one"
        ? mockTrips.slice(0, 1)
        : mockTrips;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <InitialsAvatar initials={mockUser.initials} />
            <View style={styles.greetingCol}>
              <Text style={styles.greeting}>{t("home.greeting")}</Text>
              <Text style={styles.userName}>{mockUser.name}</Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("home.notifications")}
          >
            <View style={styles.bellButton}>
              <BellIcon
                width={20}
                height={20}
                color={colors.neutral.textPrimary}
              />
              <View style={styles.bellDot} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <Text style={styles.sectionTitleLarge}>{t("home.title")}</Text>
          <View style={styles.fields}>
            <SearchPill icon={NavigationIcon} text={origin} />
            <SearchPill
              icon={SearchIcon}
              text={destination ?? t("home.searchPlaceholder")}
              isPlaceholder={!destination}
              onPress={() => push("/search-destination")}
            />
            <Button label={t("home.searchCta")} />
          </View>
        </View>

        {hasNextTrip && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.nextTrip.title")}</Text>
            <NextTripCard trip={mockNextTrip} />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.favorites.title")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            {favoriteDestinations.map((destination) => (
              <DestinationChip key={destination} label={destination} />
            ))}
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("home.favorites.add")}
            >
              <View style={[styles.chip, styles.addChip]}>
                <PlusIcon
                  width={14}
                  height={14}
                  color={colors.neutral.textPrimary}
                />
                <Text style={[styles.chipText, styles.addChipText]}>
                  {t("home.favorites.add")}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.tripsSection}>
          <View style={styles.tripsHeader}>
            <Text style={styles.sectionTitle}>{t("home.trips.title")}</Text>
            {trips.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("home.trips.seeAll")}
              >
                <Text style={styles.seeAll}>{t("home.trips.seeAll")}</Text>
              </TouchableOpacity>
            )}
          </View>
          {trips.length > 0 ? (
            <View>
              {trips.map((trip, index) => (
                <View key={trip.id}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <TripRow trip={trip} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.tripsEmptyCard}>
              <View style={styles.tripsEmptyIcon}>
                <CarNavigationIcon
                  width={32}
                  height={32}
                  color={colors.neutral.textPrimary}
                />
              </View>
              <Text style={styles.tripsEmptyTitle}>
                {t("home.trips.emptyTitle")}
              </Text>
              <Text style={styles.tripsEmptyBody}>
                {t("home.trips.emptyBody")}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      <TabBar activeTab="search" />
      <DevMenu bottomOffset={76} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 36,
    gap: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greetingCol: {
    gap: 2,
  },
  greeting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: colors.neutral.textPrimary,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  searchSection: {
    gap: 14,
  },
  sectionTitleLarge: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.neutral.textPrimary,
  },
  fields: {
    gap: 12,
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
    borderColor: colors.neutral.border,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchPillText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  placeholderText: {
    color: colors.neutral.textSecondary,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.neutral.textPrimary,
  },
  chipsScroll: {
    marginHorizontal: -24,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  addChip: {
    borderColor: colors.neutral.textPrimary,
  },
  addChipText: {
    fontFamily: fonts.semiBold,
  },
  tripsSection: {
    gap: 4,
  },
  tripsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAll: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  tripsEmptyCard: {
    marginTop: 12,
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    backgroundColor: colors.neutral.surfaceSubtle,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  tripsEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tripsEmptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
    textAlign: "center",
  },
  tripsEmptyBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.neutral.textSecondary,
    textAlign: "center",
  },
});

export default Home;
