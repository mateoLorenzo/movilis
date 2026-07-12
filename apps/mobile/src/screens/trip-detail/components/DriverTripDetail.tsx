import { useRouter } from "expo-router";
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

import CheckIcon from "@/assets/svg/check.svg";
import ChevronLeftIcon from "@/assets/svg/chevron-left.svg";
import EllipsisVerticalIcon from "@/assets/svg/ellipsis-vertical.svg";
import ShareIcon from "@/assets/svg/share.svg";
import StarIcon from "@/assets/svg/star.svg";
import { DevMenu } from "@/components/DevMenu";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import {
  mockDriverTrip,
  mockInterestedPassengers,
} from "@/screens/trip-detail/constants";
import type { InterestedPassenger } from "@/screens/trip-detail/interfaces";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const DriverTripDetail = () => {
  const { t } = useTranslation();
  const { back } = useRouter();
  const [passengers, setPassengers] = useState<InterestedPassenger[]>(
    mockInterestedPassengers,
  );

  const assignedCount = passengers.filter(
    (passenger) => passenger.assigned,
  ).length;

  const acceptPassenger = (passengerId: string) => {
    setPassengers((current) =>
      current.map((passenger) =>
        passenger.id === passengerId
          ? { ...passenger, assigned: true }
          : passenger,
      ),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={back}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("searchDestination.back")}
          >
            <View style={styles.iconButton}>
              <ChevronLeftIcon
                width={24}
                height={24}
                color={colors.neutral.textPrimary}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("tripDetail.moreOptions")}
          >
            <View style={styles.iconButton}>
              <EllipsisVerticalIcon
                width={20}
                height={20}
                color={colors.neutral.textPrimary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {mockDriverTrip.from} → {mockDriverTrip.to}
          </Text>
          <Text style={styles.titleMeta}>{mockDriverTrip.dateLong}</Text>
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statsCol}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusValue}>{t("tripDetail.active")}</Text>
            </View>
            <Text style={styles.statsLabel}>{t("tripDetail.status")}</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsCol}>
            <Text style={styles.statsValue}>
              {t("tripDetail.seatsOf", {
                available: assignedCount,
                total: mockDriverTrip.seatsTotal,
              })}
            </Text>
            <Text style={styles.statsLabel}>
              {t("tripDetail.seatsAssigned")}
            </Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsCol}>
            <Text style={styles.statsValue}>{mockDriverTrip.price}</Text>
            <Text style={styles.statsLabel}>{t("tripDetail.perSeat")}</Text>
          </View>
        </View>

        <View style={styles.hairline} />

        <View style={styles.interestedSection}>
          <Text style={styles.sectionTitle}>
            {t("tripDetail.interested", { count: passengers.length })}
          </Text>
          <Text style={styles.sectionSub}>{t("tripDetail.interestedSub")}</Text>
          <View>
            {passengers.map((passenger, index) => (
              <View key={passenger.id}>
                {index > 0 && <View style={styles.hairline} />}
                <View style={styles.personRow}>
                  <InitialsAvatar
                    initials={passenger.initials}
                    size={48}
                    fontSize={15}
                  />
                  <View style={styles.personCol}>
                    <Text style={styles.personName}>{passenger.name}</Text>
                    {passenger.isNew ? (
                      <Text style={styles.personMeta}>
                        {t("tripDetail.newUser")}
                      </Text>
                    ) : (
                      <View style={styles.personMetaRow}>
                        <StarIcon
                          width={11}
                          height={11}
                          color={colors.neutral.textPrimary}
                        />
                        <Text style={styles.personMeta}>
                          {t("tripDetail.ratingTrips", {
                            rating: passenger.rating,
                            count: passenger.tripsCount,
                          })}
                        </Text>
                      </View>
                    )}
                  </View>
                  {passenger.assigned ? (
                    <View style={styles.assignedRow}>
                      <CheckIcon
                        width={14}
                        height={14}
                        color={colors.feedback.successDark}
                      />
                      <Text style={styles.assignedText}>
                        {t("tripDetail.assigned")}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => acceptPassenger(passenger.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("tripDetail.accept")} ${passenger.name}`}
                    >
                      <View style={styles.acceptButton}>
                        <Text style={styles.acceptText}>
                          {t("tripDetail.accept")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.hairline} />

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("tripDetail.shareTrip")}
        >
          <View style={styles.shareCta}>
            <ShareIcon
              width={17}
              height={17}
              color={colors.neutral.textPrimary}
            />
            <Text style={styles.shareText}>{t("tripDetail.shareTrip")}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      <DevMenu sections={["tripView"]} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: -8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    gap: 6,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.neutral.textPrimary,
  },
  titleMeta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
  },
  statsCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.feedback.success,
  },
  statusValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.feedback.successDark,
  },
  statsValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  statsLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  statsDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.neutral.divider,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  interestedSection: {
    gap: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.neutral.textPrimary,
  },
  sectionSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  personCol: {
    flex: 1,
    gap: 2,
  },
  personName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  personMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  personMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  assignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  assignedText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.feedback.successDark,
  },
  acceptButton: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral.textPrimary,
    backgroundColor: colors.neutral.background,
  },
  acceptText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  shareCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.neutral.textPrimary,
    backgroundColor: colors.neutral.background,
  },
  shareText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
});

export { DriverTripDetail };
