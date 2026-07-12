import { useLocalSearchParams, useRouter } from "expo-router";
import type { FC } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import CalendarIcon from "@/assets/svg/calendar.svg";
import ChevronLeftIcon from "@/assets/svg/chevron-left.svg";
import InfoIcon from "@/assets/svg/info.svg";
import MapPinIcon from "@/assets/svg/map-pin.svg";
import ShareIcon from "@/assets/svg/share.svg";
import StarIcon from "@/assets/svg/star.svg";
import TicketIcon from "@/assets/svg/ticket.svg";
import UsersIcon from "@/assets/svg/users.svg";
import WhatsAppIcon from "@/assets/svg/whatsapp.svg";
import { DevMenu } from "@/components/DevMenu";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { DriverTripDetail } from "@/screens/trip-detail/components/DriverTripDetail";
import { findMockTrip, mockTripExtras } from "@/screens/trip-detail/constants";
import { useDevMocksStore } from "@/store/dev.store";
import { useSearchStore } from "@/store/search.store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

interface DetailRowProps {
  icon: FC<SvgProps>;
  label: string;
  value: string;
}

const DetailRow = ({ icon: Icon, label, value }: DetailRowProps) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      <Icon width={17} height={17} color={colors.neutral.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

interface TrustColProps {
  value: string;
  label: string;
  withStar?: boolean;
}

const TrustCol = ({ value, label, withStar }: TrustColProps) => (
  <View style={styles.trustCol}>
    <View style={styles.trustValueRow}>
      <Text style={styles.trustValue}>{value}</Text>
      {withStar && (
        <StarIcon width={13} height={13} color={colors.neutral.textPrimary} />
      )}
    </View>
    <Text style={styles.trustLabel}>{label}</Text>
  </View>
);

const TripDetail = () => {
  const { t } = useTranslation();
  const { back } = useRouter();
  const { bottom } = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const destination = useSearchStore((state) => state.destination);
  const driverTripView = useDevMocksStore((state) => state.driverTripView);

  const trip = useMemo(
    () => findMockTrip(id, destination ?? ""),
    [id, destination],
  );

  if (driverTripView) {
    return <DriverTripDetail />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
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
            accessibilityLabel={t("tripDetail.share")}
          >
            <View style={styles.iconButton}>
              <ShareIcon
                width={20}
                height={20}
                color={colors.neutral.textPrimary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {trip.from} → {trip.to}
          </Text>
          <Text style={styles.titleMeta}>{mockTripExtras.dateLong}</Text>
        </View>

        <View style={styles.hairline} />

        <View style={styles.hostRow}>
          <InitialsAvatar
            initials={trip.driverInitials}
            size={48}
            fontSize={15}
          />
          <View style={styles.hostCol}>
            <Text style={styles.hostName}>
              {t("tripDetail.travelWith", { name: trip.driverName })}
            </Text>
            <Text style={styles.hostSub}>{t("tripDetail.verified")}</Text>
          </View>
        </View>

        <View style={styles.trustBar}>
          <TrustCol
            value={trip.rating}
            label={t("tripDetail.rating")}
            withStar
          />
          <View style={styles.trustDivider} />
          <TrustCol
            value={`${mockTripExtras.driverTripsCount}`}
            label={t("tripDetail.tripsDone")}
          />
          <View style={styles.trustDivider} />
          <TrustCol
            value={t("tripDetail.seatsOf", {
              available: trip.seatsAvailable,
              total: mockTripExtras.seatsTotal,
            })}
            label={t("tripDetail.seatsFree")}
          />
        </View>

        <View style={styles.hairline} />

        <View style={styles.routeSection}>
          <Text style={styles.sectionTitle}>{t("tripDetail.route")}</Text>
          <View>
            <View style={styles.routeRow}>
              <View style={styles.routeMarker}>
                <View style={styles.routeDot} />
              </View>
              <View style={styles.routeTextCol}>
                <Text style={styles.routeName}>{trip.from}</Text>
                <Text style={styles.routeLabel}>{t("tripDetail.origin")}</Text>
              </View>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routeRow}>
              <View style={styles.routeMarker}>
                <MapPinIcon
                  width={18}
                  height={18}
                  color={colors.accent.primary}
                />
              </View>
              <View style={styles.routeTextCol}>
                <Text style={styles.routeName}>{trip.to}</Text>
                <Text style={styles.routeLabel}>
                  {t("tripDetail.destination")}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.pointNote}>
            <InfoIcon
              width={14}
              height={14}
              color={colors.neutral.textSecondary}
            />
            <Text style={styles.pointNoteText}>
              {t("tripDetail.pointNote")}
            </Text>
          </View>
        </View>

        <View style={styles.hairline} />

        <View>
          <DetailRow
            icon={CalendarIcon}
            label={t("tripDetail.dateTime")}
            value={trip.datetime}
          />
          <View style={styles.hairline} />
          <DetailRow
            icon={UsersIcon}
            label={t("tripDetail.seatsAvailable")}
            value={t("tripDetail.seatsOf", {
              available: trip.seatsAvailable,
              total: mockTripExtras.seatsTotal,
            })}
          />
          <View style={styles.hairline} />
          <DetailRow
            icon={TicketIcon}
            label={t("tripDetail.pricePerSeat")}
            value={trip.price}
          />
        </View>

        <View style={styles.hairline} />

        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>{t("tripDetail.notes")}</Text>
          <Text style={styles.notesBody}>{mockTripExtras.notes}</Text>
        </View>

        <Text style={styles.disclaimer}>{t("tripDetail.disclaimer")}</Text>
      </ScrollView>

      <View style={styles.bottomBarHairline} />
      <View style={[styles.bottomBar, { paddingBottom: Math.max(bottom, 24) }]}>
        <View style={styles.bottomLeft}>
          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomPrice}>{trip.price}</Text>
            <Text style={styles.bottomPer}>{t("trip.perSeat")}</Text>
          </View>
          <Text style={styles.bottomDate}>{trip.datetime}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("tripDetail.reserve")}
        >
          <View style={styles.reserveCta}>
            <WhatsAppIcon
              width={18}
              height={18}
              color={colors.accent.onAccent}
            />
            <Text style={styles.reserveText}>{t("tripDetail.reserve")}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <DevMenu sections={["tripView"]} />
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
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  hairline: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  hostCol: {
    flex: 1,
    gap: 2,
  },
  hostName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  hostSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  trustBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
  },
  trustCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  trustValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  trustLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  trustDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.neutral.divider,
  },
  routeSection: {
    gap: 14,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.neutral.textPrimary,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  routeMarker: {
    width: 20,
    alignItems: "center",
    paddingTop: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.primary,
  },
  routeTextCol: {
    flex: 1,
    gap: 1,
  },
  routeName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  routeLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textMuted,
  },
  routeConnector: {
    width: 2,
    height: 18,
    marginLeft: 9,
    marginVertical: 2,
    backgroundColor: colors.neutral.divider,
  },
  pointNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.neutral.surfaceSubtle,
  },
  pointNoteText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  detailValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  notesSection: {
    gap: 8,
  },
  notesBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.neutral.textSecondary,
  },
  disclaimer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral.textMuted,
    textAlign: "center",
  },
  bottomBarHairline: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingHorizontal: 24,
    backgroundColor: colors.neutral.background,
  },
  bottomLeft: {
    gap: 2,
  },
  bottomPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
  },
  bottomPrice: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.neutral.textPrimary,
  },
  bottomPer: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  bottomDate: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  reserveCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.brand.whatsapp,
  },
  reserveText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.accent.onAccent,
  },
});

export default TripDetail;
