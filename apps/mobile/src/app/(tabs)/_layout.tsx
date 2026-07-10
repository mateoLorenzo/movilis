import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";

import CirclePlusIcon from "@/assets/svg/circle-plus.svg";
import CircleUserRoundIcon from "@/assets/svg/circle-user-round.svg";
import SearchIcon from "@/assets/svg/search.svg";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { colors } from "@/theme/colors";

const TabsLayout = () => {
  const { t } = useTranslation();

  if (process.env.EXPO_OS === "ios") {
    return (
      <NativeTabs
        tintColor={colors.accent.primary}
        minimizeBehavior="onScrollDown"
      >
        <NativeTabs.Trigger name="home">
          <NativeTabs.Trigger.Icon sf="magnifyingglass" />
          <NativeTabs.Trigger.Label>
            {t("tabs.search")}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="publish">
          <NativeTabs.Trigger.Icon
            sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          />
          <NativeTabs.Trigger.Label>
            {t("tabs.publish")}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon
            sf={{
              default: "person.crop.circle",
              selected: "person.crop.circle.fill",
            }}
          />
          <NativeTabs.Trigger.Label>
            {t("tabs.profile")}
          </NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.search"),
          tabBarIcon: ({ color, size }) => (
            <SearchIcon width={size} height={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="publish"
        options={{
          title: t("tabs.publish"),
          tabBarIcon: ({ color, size }) => (
            <CirclePlusIcon width={size} height={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, size }) => (
            <CircleUserRoundIcon width={size} height={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
