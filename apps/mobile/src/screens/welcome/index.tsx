import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import CarIcon from "@/assets/svg/car.svg";
import MessageCircleIcon from "@/assets/svg/message-circle.svg";
import SearchIcon from "@/assets/svg/search.svg";
import { Button } from "@/components/Button";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const LogoMark = () => (
  <View style={styles.logoMark}>
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accent.gradientStart} />
          <Stop offset="1" stopColor={colors.accent.gradientEnd} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#logoGradient)" />
    </Svg>
    <CarIcon width={28} height={28} color={colors.accent.onAccent} />
  </View>
);

interface FeatureRowProps {
  icon: FC<SvgProps>;
  title: string;
  body: string;
}

const FeatureRow = ({ icon: Icon, title, body }: FeatureRowProps) => (
  <View style={styles.featureRow}>
    <View style={styles.featureTile}>
      <Icon width={24} height={24} color={colors.neutral.textPrimary} />
    </View>
    <View style={styles.featureCol}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  </View>
);

const Welcome = () => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <LogoMark />
        <Text style={styles.title}>{t("welcome.title")}</Text>
        <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>
        <View style={styles.features}>
          <FeatureRow
            icon={SearchIcon}
            title={t("welcome.features.search.title")}
            body={t("welcome.features.search.body")}
          />
          <FeatureRow
            icon={CarIcon}
            title={t("welcome.features.publish.title")}
            body={t("welcome.features.publish.body")}
          />
          <FeatureRow
            icon={MessageCircleIcon}
            title={t("welcome.features.whatsapp.title")}
            body={t("welcome.features.whatsapp.body")}
          />
        </View>
        <View style={styles.spacer} />
        <Button label={t("welcome.cta")} />
        <Text style={styles.note}>{t("welcome.note")}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  title: {
    marginTop: 28,
    fontFamily: fonts.extraBold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.neutral.textPrimary,
  },
  subtitle: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.neutral.textSecondary,
  },
  features: {
    marginTop: 40,
    gap: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureTile: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.neutral.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  featureCol: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  featureBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  note: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: "center",
    color: colors.neutral.textMuted,
  },
});

export default Welcome;
