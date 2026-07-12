import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import StarIcon from "@/assets/svg/star.svg";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { Button } from "@/components/Button";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { mockDriverReview } from "@/screens/home/constants";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const STAR_COUNT = 5;

const initialRatings = Object.fromEntries(
  mockDriverReview.passengers.map((passenger) => [
    passenger.id,
    passenger.rating,
  ]),
);

interface ReviewPassengersSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const ReviewPassengersSheet = ({
  visible,
  onDismiss,
}: ReviewPassengersSheetProps) => {
  const { t } = useTranslation();
  const [ratings, setRatings] =
    useState<Record<string, number>>(initialRatings);

  const setPassengerRating = (passengerId: string, rating: number) => {
    setRatings((current) => ({ ...current, [passengerId]: rating }));
  };

  return (
    <BottomSheetModal visible={visible} onDismiss={onDismiss} anchored>
      <View style={styles.content}>
        <Text style={styles.bigTitle}>{t("review.titleDriver")}</Text>
        <Text style={styles.routeMeta}>
          {mockDriverReview.from} → {mockDriverReview.to} ·{" "}
          {mockDriverReview.dateLabel}
        </Text>

        <View>
          {mockDriverReview.passengers.map((passenger, index) => (
            <View key={passenger.id}>
              {index > 0 && <View style={styles.hairline} />}
              <View style={styles.passengerRow}>
                <InitialsAvatar
                  initials={passenger.initials}
                  size={48}
                  fontSize={15}
                />
                <View style={styles.passengerCol}>
                  <Text style={styles.passengerName}>{passenger.name}</Text>
                  <View style={styles.stars}>
                    {Array.from({ length: STAR_COUNT }, (_, starIndex) => {
                      const starValue = starIndex + 1;
                      const isFilled = starValue <= ratings[passenger.id];
                      return (
                        <TouchableOpacity
                          key={starValue}
                          onPress={() =>
                            setPassengerRating(passenger.id, starValue)
                          }
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={t("review.rateStar", {
                            count: starValue,
                          })}
                          accessibilityState={{ selected: isFilled }}
                        >
                          <StarIcon
                            width={22}
                            height={22}
                            color={
                              isFilled
                                ? colors.neutral.textPrimary
                                : colors.neutral.divider
                            }
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Button label={t("review.submitAll")} onPress={onDismiss} />

        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("review.notNow")}
        >
          <Text style={styles.skip}>{t("review.notNow")}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 12,
    paddingTop: 8,
  },
  bigTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.neutral.textPrimary,
  },
  routeMeta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  passengerCol: {
    flex: 1,
    gap: 6,
  },
  passengerName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
  },
  stars: {
    flexDirection: "row",
    gap: 6,
  },
  skip: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textSecondary,
    textAlign: "center",
    paddingVertical: 4,
  },
});

export { ReviewPassengersSheet };
