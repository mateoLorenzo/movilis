import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ArrowRightIcon from "@/assets/svg/arrow-right.svg";
import MessageCircleIcon from "@/assets/svg/message-circle.svg";
import StarIcon from "@/assets/svg/star.svg";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import type { NextTrip } from "@/screens/home/interfaces";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface NextTripCardProps {
  trip: NextTrip;
  onChatPress?: () => void;
}

const NextTripCard = ({ trip, onChatPress }: NextTripCardProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{t("home.nextTrip.confirmed")}</Text>
      </View>
      <View style={styles.routeRow}>
        <Text style={styles.routeText}>{trip.from}</Text>
        <ArrowRightIcon
          width={16}
          height={16}
          color={colors.neutral.textSecondary}
        />
        <Text style={styles.routeText}>{trip.to}</Text>
      </View>
      <Text style={styles.meta}>{trip.datetime}</Text>
      <View style={styles.divider} />
      <View style={styles.driverRow}>
        <View style={styles.driverInfo}>
          <InitialsAvatar initials={trip.driverInitials} />
          <View style={styles.driverCol}>
            <Text style={styles.driverName}>{trip.driverName}</Text>
            <View style={styles.ratingRow}>
              <StarIcon
                width={12}
                height={12}
                color={colors.neutral.textPrimary}
              />
              <Text style={styles.ratingText}>{trip.rating}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={onChatPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("home.nextTrip.chat")}
        >
          <View style={styles.chatButton}>
            <MessageCircleIcon
              width={20}
              height={20}
              color={colors.feedback.success}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    padding: 20,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.feedback.success,
  },
  statusText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.feedback.successDark,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.neutral.textPrimary,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverCol: {
    gap: 2,
  },
  driverName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
    alignItems: "center",
    justifyContent: "center",
  },
});

export { NextTripCard };
