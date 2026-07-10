import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

const Publish = () => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("publish.title")}</Text>
        <Text style={styles.body}>{t("publish.comingSoon")}</Text>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.neutral.textPrimary,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.neutral.textSecondary,
    textAlign: "center",
  },
});

export default Publish;
