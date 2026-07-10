import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import ArrowRightIcon from "@/assets/svg/arrow-right.svg";
import NavigationIcon from "@/assets/svg/navigation.svg";
import StarIcon from "@/assets/svg/star.svg";
import { InitialsAvatar } from "@/screens/home/components/InitialsAvatar";
import type { TripListing } from "@/screens/home/interfaces";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface TripRowProps {
  trip: TripListing;
}

const TripRow = ({ trip }: TripRowProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <InitialsAvatar initials={trip.driverInitials} size={48} fontSize={15} />
      <View style={styles.mid}>
        <View style={styles.routeRow}>
          <Text style={styles.routeText}>{trip.from}</Text>
          <ArrowRightIcon
            width={14}
            height={14}
            color={colors.neutral.textSecondary}
          />
          <Text style={styles.routeText}>{trip.to}</Text>
        </View>
        <Text style={styles.meta}>
          {trip.datetime} ·{" "}
          {t("home.trips.seats", { count: trip.seatsAvailable })}
        </Text>
        <View style={styles.driverLine}>
          <StarIcon width={11} height={11} color={colors.neutral.textPrimary} />
          <Text style={styles.driverText}>
            {trip.rating} · {trip.driverName}
          </Text>
        </View>
        {trip.proximityKm !== undefined && (
          <View style={styles.proximityRow}>
            <NavigationIcon
              width={12}
              height={12}
              color={colors.neutral.textPrimary}
            />
            <Text style={styles.proximityText}>
              {t("home.trips.proximity", { km: trip.proximityKm })}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.priceCol}>
        <Text style={styles.price}>{trip.price}</Text>
        <Text style={styles.perSeat}>{t("home.trips.perSeat")}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 18,
  },
  mid: {
    flex: 1,
    gap: 4,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  driverLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  driverText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  proximityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  proximityText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  priceCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  price: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  perSeat: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
});

export { TripRow };
