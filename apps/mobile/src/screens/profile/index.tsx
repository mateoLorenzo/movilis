import Constants from "expo-constants";
import type { FC } from "react";
import { useState } from "react";
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

import ChevronRightIcon from "@/assets/svg/chevron-right.svg";
import LogOutIcon from "@/assets/svg/log-out.svg";
import MapPinIcon from "@/assets/svg/map-pin.svg";
import StarIcon from "@/assets/svg/star.svg";
import StarOutlineIcon from "@/assets/svg/star-outline.svg";
import Trash2Icon from "@/assets/svg/trash-2.svg";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import {
  mockCompletedTrips,
  mockProfile,
  mockPublishedTrips,
} from "@/screens/profile/constants";
import type { ProfileTrip } from "@/screens/profile/interfaces";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type TripsSegment = "completed" | "published";

interface OptionRowProps {
  icon: FC<SvgProps>;
  label: string;
  destructive?: boolean;
  withChevron?: boolean;
  onPress?: () => void;
}

const OptionRow = ({
  icon: Icon,
  label,
  destructive,
  withChevron = true,
  onPress,
}: OptionRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={styles.optionRow}>
      <Icon
        width={20}
        height={20}
        color={destructive ? colors.feedback.error : colors.neutral.textPrimary}
      />
      <Text style={[styles.optionLabel, destructive && styles.optionDanger]}>
        {label}
      </Text>
      {withChevron && (
        <ChevronRightIcon
          width={18}
          height={18}
          color={colors.neutral.textMuted}
        />
      )}
    </View>
  </TouchableOpacity>
);

interface ProfileTripRowProps {
  trip: ProfileTrip;
}

const ProfileTripRow = ({ trip }: ProfileTripRowProps) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${trip.from} → ${trip.to}`}
    >
      <View style={styles.tripRow}>
        <View style={styles.tripCol}>
          <Text style={styles.tripRoute}>
            {trip.from} → {trip.to}
          </Text>
          <Text style={styles.tripMeta}>
            {trip.dateLabel} ·{" "}
            {t(
              trip.role === "driver"
                ? "profile.roleDriver"
                : "profile.rolePassenger",
            )}
          </Text>
        </View>
        <ChevronRightIcon
          width={18}
          height={18}
          color={colors.neutral.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
};

const Profile = () => {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<TripsSegment>("completed");

  const trips =
    segment === "completed" ? mockCompletedTrips : mockPublishedTrips;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("profile.title")}</Text>

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={mockProfile.name}
        >
          <View style={styles.userRow}>
            <InitialsAvatar
              initials={mockProfile.initials}
              size={64}
              fontSize={20}
            />
            <View style={styles.userCol}>
              <Text style={styles.userName}>{mockProfile.name}</Text>
              <Text style={styles.userPhone}>{mockProfile.phone}</Text>
              <View style={styles.userRating}>
                <StarIcon
                  width={11}
                  height={11}
                  color={colors.neutral.textPrimary}
                />
                <Text style={styles.userRatingText}>
                  {t("profile.ratingSummary", {
                    rating: mockProfile.rating,
                    count: mockProfile.tripsCount,
                  })}
                </Text>
              </View>
            </View>
            <ChevronRightIcon
              width={20}
              height={20}
              color={colors.neutral.textMuted}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.hairline} />

        <View style={styles.tripsSection}>
          <Text style={styles.sectionTitle}>{t("profile.myTrips")}</Text>
          <View style={styles.segmented}>
            <TouchableOpacity
              style={styles.segmentTouchable}
              onPress={() => setSegment("completed")}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: segment === "completed" }}
              accessibilityLabel={t("profile.completed")}
            >
              <View
                style={[
                  styles.segment,
                  segment === "completed" && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    segment === "completed" && styles.segmentTextSelected,
                  ]}
                >
                  {t("profile.completed")}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.segmentTouchable}
              onPress={() => setSegment("published")}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: segment === "published" }}
              accessibilityLabel={t("profile.published")}
            >
              <View
                style={[
                  styles.segment,
                  segment === "published" && styles.segmentSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    segment === "published" && styles.segmentTextSelected,
                  ]}
                >
                  {t("profile.published")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View>
            {trips.map((trip, index) => (
              <View key={trip.id}>
                {index > 0 && <View style={styles.hairline} />}
                <ProfileTripRow trip={trip} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.hairline} />

        <View>
          <OptionRow icon={MapPinIcon} label={t("profile.favorites")} />
          <View style={styles.hairline} />
          <OptionRow icon={StarOutlineIcon} label={t("profile.rateApp")} />
          <View style={styles.hairline} />
          <OptionRow icon={LogOutIcon} label={t("profile.logout")} />
          <View style={styles.hairline} />
          <OptionRow
            icon={Trash2Icon}
            label={t("profile.deleteAccount")}
            destructive
            withChevron={false}
          />
        </View>

        <Text style={styles.version}>
          {t("profile.version", { version: appVersion })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: process.env.EXPO_OS === "android" ? 120 : 28,
    gap: 22,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    color: colors.neutral.textPrimary,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userCol: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.neutral.textPrimary,
  },
  userPhone: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  userRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userRatingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  tripsSection: {
    gap: 14,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.neutral.textPrimary,
  },
  segmented: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.neutral.surfaceSubtle,
  },
  segmentTouchable: {
    flex: 1,
  },
  segment: {
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentSelected: {
    backgroundColor: colors.neutral.background,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  segmentTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.neutral.textPrimary,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  tripCol: {
    gap: 2,
  },
  tripRoute: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  tripMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  optionLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  optionDanger: {
    color: colors.feedback.error,
  },
  version: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textMuted,
    textAlign: "center",
  },
});

export default Profile;
