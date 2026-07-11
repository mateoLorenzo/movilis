import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MinusIcon from "@/assets/svg/minus.svg";
import PhoneIcon from "@/assets/svg/phone.svg";
import PlusIcon from "@/assets/svg/plus.svg";
import SparklesIcon from "@/assets/svg/sparkles.svg";
import XIcon from "@/assets/svg/x.svg";
import { Button } from "@/components/Button";
import { mockPublishDefaults } from "@/screens/publish/constants";
import { useSearchStore } from "@/store/search.store";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const Publish = () => {
  const { t } = useTranslation();
  const { push } = useRouter();
  const origin = useSearchStore((state) => state.origin);

  const [tripOrigin, setTripOrigin] = useState<string>(origin);
  const [destination, setDestination] = useState("");
  const [seats, setSeats] = useState<number>(mockPublishDefaults.seats);
  const [price, setPrice] = useState<string>(mockPublishDefaults.price);
  const [notes, setNotes] = useState("");

  const canDecrease = seats > mockPublishDefaults.minSeats;
  const canIncrease = seats < mockPublishDefaults.maxSeats;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => push("/home")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        >
          <View style={styles.closeButton}>
            <XIcon width={20} height={20} color={colors.neutral.textPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("publish.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.hairline} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("publish.routeTitle")}</Text>
            <View style={styles.group}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{t("publish.origin")}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={tripOrigin}
                  onChangeText={setTripOrigin}
                  placeholder={t("publish.originPlaceholder")}
                  placeholderTextColor={colors.neutral.textMuted}
                  accessibilityLabel={t("publish.origin")}
                />
              </View>
              <View style={styles.groupDivider} />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>
                  {t("publish.destination")}
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  value={destination}
                  onChangeText={setDestination}
                  placeholder={t("publish.destinationPlaceholder")}
                  placeholderTextColor={colors.neutral.textMuted}
                  accessibilityLabel={t("publish.destination")}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("publish.whenTitle")}</Text>
            <View style={styles.group}>
              {/* TODO: open date picker */}
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("publish.date")}
              >
                <View style={styles.whenRow}>
                  <Text style={styles.whenLabel}>{t("publish.date")}</Text>
                  <Text style={styles.whenValue}>
                    {mockPublishDefaults.dateLabel}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.groupDivider} />
              {/* TODO: open time picker */}
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("publish.time")}
              >
                <View style={styles.whenRow}>
                  <Text style={styles.whenLabel}>{t("publish.time")}</Text>
                  <Text style={styles.whenValue}>
                    {mockPublishDefaults.timeLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t("publish.seatsPriceTitle")}
            </Text>
            <View style={styles.seatsPriceRow}>
              <View style={styles.box}>
                <Text style={styles.fieldLabel}>{t("publish.seats")}</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => setSeats(seats - 1)}
                    disabled={!canDecrease}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("publish.decreaseSeats")}
                  >
                    <View
                      style={[
                        styles.stepperButton,
                        !canDecrease && styles.stepperButtonDisabled,
                      ]}
                    >
                      <MinusIcon
                        width={13}
                        height={13}
                        color={colors.neutral.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{seats}</Text>
                  <TouchableOpacity
                    onPress={() => setSeats(seats + 1)}
                    disabled={!canIncrease}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("publish.increaseSeats")}
                  >
                    <View
                      style={[
                        styles.stepperButton,
                        styles.stepperButtonDark,
                        !canIncrease && styles.stepperButtonDisabled,
                      ]}
                    >
                      <PlusIcon
                        width={13}
                        height={13}
                        color={colors.accent.onAccent}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.box}>
                <Text style={styles.fieldLabel}>
                  {t("publish.pricePerSeat")}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    accessibilityLabel={t("publish.pricePerSeat")}
                  />
                </View>
              </View>
            </View>
            <View style={styles.priceHint}>
              <SparklesIcon
                width={13}
                height={13}
                color={colors.neutral.textSecondary}
              />
              <Text style={styles.priceHintText}>
                {t("publish.priceHint", {
                  min: mockPublishDefaults.suggestedMin,
                  max: mockPublishDefaults.suggestedMax,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.notesTitleRow}>
              <Text style={styles.sectionTitle}>{t("publish.notesTitle")}</Text>
              <Text style={styles.notesOptional}>{t("publish.optional")}</Text>
            </View>
            <TextInput
              style={styles.notesArea}
              value={notes}
              onChangeText={setNotes}
              placeholder={t("publish.notesPlaceholder")}
              placeholderTextColor={colors.neutral.textMuted}
              multiline
              textAlignVertical="top"
              accessibilityLabel={t("publish.notesTitle")}
            />
          </View>

          <View style={styles.contactBanner}>
            <PhoneIcon
              width={18}
              height={18}
              color={colors.neutral.textPrimary}
            />
            <View style={styles.contactCol}>
              <Text style={styles.contactHint}>{t("publish.contactHint")}</Text>
              <Text style={styles.contactValue}>
                {mockPublishDefaults.phone}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("publish.edit")}
            >
              <Text style={styles.contactEdit}>{t("publish.edit")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ctaBlock}>
            <Button label={t("publish.cta")} />
            <Text style={styles.micro}>{t("publish.micro")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  headerSpacer: {
    width: 24,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 24,
    // Android needs extra space for the floating tab bar; iOS gets it from
    // the native tab bar via contentInsetAdjustmentBehavior
    paddingBottom: process.env.EXPO_OS === "android" ? 120 : 28,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
  },
  groupDivider: {
    height: 1,
    backgroundColor: colors.neutral.divider,
  },
  fieldRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 2,
  },
  fieldLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  fieldInput: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textPrimary,
    padding: 0,
  },
  whenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  whenLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  whenValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  seatsPriceRow: {
    flexDirection: "row",
    gap: 10,
  },
  box: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
    padding: 14,
    gap: 10,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    backgroundColor: colors.neutral.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDark: {
    backgroundColor: colors.neutral.textPrimary,
    borderColor: colors.neutral.textPrimary,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.neutral.textPrimary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
  },
  priceCurrency: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.neutral.textSecondary,
  },
  priceInput: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.neutral.textPrimary,
    padding: 0,
  },
  priceHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceHintText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  notesTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  notesOptional: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.neutral.textMuted,
  },
  notesArea: {
    height: 88,
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
  contactBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    backgroundColor: colors.neutral.surfaceSubtle,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contactCol: {
    flex: 1,
    gap: 1,
  },
  contactHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  contactValue: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.neutral.textPrimary,
  },
  contactEdit: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.neutral.textPrimary,
  },
  ctaBlock: {
    gap: 10,
  },
  micro: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral.textMuted,
    textAlign: "center",
  },
});

export default Publish;
