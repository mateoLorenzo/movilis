import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import StarIcon from "@/assets/svg/star.svg";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { Button } from "@/components/Button";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { mockReviewTrip } from "@/screens/home/constants";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const STAR_COUNT = 5;

interface ReviewTripSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const ReviewTripSheet = ({ visible, onDismiss }: ReviewTripSheetProps) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState("");

  return (
    <BottomSheetModal visible={visible} onDismiss={onDismiss} anchored>
      <View style={styles.content}>
        <Text style={styles.bigTitle}>{t("review.title")}</Text>
        <Text style={styles.routeMeta}>
          {mockReviewTrip.from} → {mockReviewTrip.to} ·{" "}
          {mockReviewTrip.dateLabel}
        </Text>

        <View style={styles.driverCol}>
          <InitialsAvatar
            initials={mockReviewTrip.driverInitials}
            size={64}
            fontSize={20}
          />
          <Text style={styles.driverName}>{mockReviewTrip.driverName}</Text>
          <Text style={styles.driverSub}>{t("review.yourDriver")}</Text>
        </View>

        <View style={styles.stars}>
          {Array.from({ length: STAR_COUNT }, (_, index) => {
            const starValue = index + 1;
            return (
              <TouchableOpacity
                key={starValue}
                onPress={() => setRating(starValue)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("review.rateStar", { count: starValue })}
                accessibilityState={{ selected: starValue <= rating }}
              >
                <StarIcon
                  width={36}
                  height={36}
                  color={
                    starValue <= rating
                      ? colors.neutral.textPrimary
                      : colors.neutral.divider
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={styles.comment}
          value={comment}
          onChangeText={setComment}
          placeholder={t("review.commentPlaceholder")}
          placeholderTextColor={colors.neutral.textMuted}
          multiline
          textAlignVertical="top"
          accessibilityLabel={t("review.commentPlaceholder")}
        />

        <View style={styles.ctaWrap}>
          <Button label={t("review.submit")} onPress={onDismiss} />
        </View>

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
    alignItems: "center",
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
  driverCol: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  driverName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  driverSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  stars: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
  },
  comment: {
    alignSelf: "stretch",
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  ctaWrap: {
    alignSelf: "stretch",
  },
  skip: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textSecondary,
    paddingVertical: 4,
  },
});

export { ReviewTripSheet };
