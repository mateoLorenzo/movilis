/* eslint-disable react-hooks/immutability -- Reanimated shared values are mutated via .value by design */
import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { fonts } from "@/theme/fonts";

type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

const TRACK_PADDING = 4;
const TRACK_BORDER = 1;
const PILL_HEIGHT = 52;
const ICON_SIZE = 20;
const PILL_SPRING = { mass: 0.7, damping: 18, stiffness: 260 };
const LIFT_SPRING = { mass: 0.6, damping: 12, stiffness: 180 };
const LIFT_SCALE_X = 1.12;
const DRAG_ACTIVATION_DISTANCE = 10;
const SCROLL_FAIL_DISTANCE = 15;

const FloatingTabBar = ({ state, descriptors, navigation }: TabBarProps) => {
  const { bottom } = useSafeAreaInsets();
  const [tabWidth, setTabWidth] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const selectedIndex = state.index;
  const routeCount = state.routes.length;

  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const hoverIndex = useSharedValue(selectedIndex);
  const lift = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      translateX.value = withSpring(selectedIndex * tabWidth, PILL_SPRING);
    }
  }, [selectedIndex, tabWidth, translateX]);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    const innerWidth =
      event.nativeEvent.layout.width - 2 * (TRACK_PADDING + TRACK_BORDER);
    setTabWidth(innerWidth / routeCount);
  };

  const selectTab = (index: number) => {
    const route = state.routes[index];
    if (!route) {
      return;
    }
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (index !== selectedIndex && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const onHoverChange = (index: number) => {
    setPreviewIndex(index);
  };

  const onDragEnd = (index: number) => {
    setPreviewIndex(null);
    selectTab(index);
  };

  const maxTranslate = (routeCount - 1) * tabWidth;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-DRAG_ACTIVATION_DISTANCE, DRAG_ACTIVATION_DISTANCE])
    .failOffsetY([-SCROLL_FAIL_DISTANCE, SCROLL_FAIL_DISTANCE])
    .onStart(() => {
      dragStartX.value = translateX.value;
      hoverIndex.value = Math.round(translateX.value / tabWidth);
      lift.value = withSpring(1, LIFT_SPRING);
    })
    .onUpdate((event) => {
      const next = Math.min(
        Math.max(dragStartX.value + event.translationX, 0),
        maxTranslate,
      );
      translateX.value = next;
      const index = Math.round(next / tabWidth);
      if (index !== hoverIndex.value) {
        hoverIndex.value = index;
        runOnJS(onHoverChange)(index);
      }
    })
    .onFinalize(() => {
      const index = Math.round(translateX.value / tabWidth);
      translateX.value = withSpring(index * tabWidth, PILL_SPRING);
      lift.value = withSpring(0, PILL_SPRING);
      runOnJS(onDragEnd)(index);
    });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scaleX: 1 + lift.value * (LIFT_SCALE_X - 1) },
    ],
  }));

  const activeIndex = previewIndex ?? selectedIndex;

  return (
    <View style={[styles.wrapper, { bottom: bottom + 16 }]} pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <View style={styles.track} onLayout={onTrackLayout}>
          {tabWidth > 0 ? (
            <Animated.View
              style={[styles.pill, { width: tabWidth }, pillStyle]}
              pointerEvents="none"
            />
          ) : null}
          {state.routes.map((route, index) => {
            const options = descriptors[route.key]?.options;
            const label = options?.title ?? route.name;
            const isActive = index === activeIndex;
            const color = isActive
              ? colors.neutral.textPrimary
              : colors.neutral.textSecondary;
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tab}
                onPress={() => selectTab(index)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: index === selectedIndex }}
                accessibilityLabel={label}
              >
                {options?.tabBarIcon?.({
                  focused: isActive,
                  color,
                  size: ICON_SIZE,
                })}
                <Text style={[styles.label, isActive && styles.labelSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  track: {
    width: 320,
    flexDirection: "row",
    alignItems: "center",
    padding: TRACK_PADDING,
    borderRadius: 9999,
    borderWidth: TRACK_BORDER,
    borderColor: colors.neutral.background,
    backgroundColor: colors.neutral.surfaceSubtle,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  pill: {
    position: "absolute",
    left: TRACK_PADDING,
    top: TRACK_PADDING,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: colors.neutral.background,
    borderWidth: 1,
    borderColor: colors.neutral.background,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: PILL_HEIGHT,
    borderRadius: 9999,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.neutral.textSecondary,
  },
  labelSelected: {
    fontFamily: fonts.semiBold,
    color: colors.neutral.textPrimary,
  },
});

export { FloatingTabBar };
