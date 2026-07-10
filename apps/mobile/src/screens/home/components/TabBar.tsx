import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";

import CirclePlusIcon from "@/assets/svg/circle-plus.svg";
import CircleUserRoundIcon from "@/assets/svg/circle-user-round.svg";
import SearchIcon from "@/assets/svg/search.svg";
import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type TabKey = "search" | "publish" | "profile";

interface TabItemProps {
  icon: FC<SvgProps>;
  label: string;
  active: boolean;
  onPress?: () => void;
}

const TabItem = ({ icon: Icon, label, active, onPress }: TabItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="tab"
    accessibilityLabel={label}
    accessibilityState={{ selected: active }}
  >
    <View style={styles.tabItem}>
      <Icon
        width={24}
        height={24}
        color={active ? colors.accent.primary : colors.neutral.textSecondary}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  </TouchableOpacity>
);

interface TabBarProps {
  activeTab?: TabKey;
}

const TabBar = ({ activeTab = "search" }: TabBarProps) => {
  const { t } = useTranslation();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottom, 20) }]}>
      <TabItem
        icon={SearchIcon}
        label={t("home.tabs.search")}
        active={activeTab === "search"}
      />
      <TabItem
        icon={CirclePlusIcon}
        label={t("home.tabs.publish")}
        active={activeTab === "publish"}
      />
      <TabItem
        icon={CircleUserRoundIcon}
        label={t("home.tabs.profile")}
        active={activeTab === "profile"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 54,
    backgroundColor: colors.neutral.background,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.divider,
  },
  tabItem: {
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.neutral.textSecondary,
  },
  tabLabelActive: {
    fontFamily: fonts.semiBold,
    color: colors.accent.primary,
  },
});

export { TabBar };
