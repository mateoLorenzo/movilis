/* eslint-disable react-hooks/immutability -- Reanimated shared values are mutated via .value by design */
import type { ReactNode, Ref } from "react";
import { useEffect, useImperativeHandle } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;
const SLIDE_DISTANCE = 600;
const DRAG_CLOSE_THRESHOLD = 120;
const DRAG_CLOSE_VELOCITY = 800;
const KEYBOARD_GAP = 20;

export interface BottomSheetModalRef {
  close: (onClosed: () => void) => void;
}

interface BottomSheetModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  anchored?: boolean;
  ref?: Ref<BottomSheetModalRef>;
}

export const BottomSheetModal = ({
  visible,
  onDismiss,
  children,
  anchored = false,
  ref,
}: BottomSheetModalProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      progress.value = withTiming(1, { duration: OPEN_DURATION });
    }
  }, [visible, progress, dragY]);

  const close = (onClosed: () => void) => {
    Keyboard.dismiss();
    progress.value = withTiming(0, { duration: CLOSE_DURATION }, (finished) => {
      if (finished) {
        runOnJS(onClosed)();
      }
    });
  };

  useImperativeHandle(ref, () => ({ close }));

  const handleDismiss = () => close(onDismiss);

  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((event) => {
      dragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldClose =
        event.translationY > DRAG_CLOSE_THRESHOLD ||
        event.velocityY > DRAG_CLOSE_VELOCITY;
      if (shouldClose) {
        dragY.value = withTiming(
          SLIDE_DISTANCE,
          { duration: CLOSE_DURATION },
          (finished) => {
            if (finished) {
              runOnJS(onDismiss)();
            }
          },
        );
        return;
      }
      dragY.value = withSpring(0, { damping: 20, stiffness: 250 });
    });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      interpolate(dragY.value, [0, SLIDE_DISTANCE], [1, 0], "clamp"),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - progress.value) * SLIDE_DISTANCE + dragY.value },
    ],
  }));

  // The sheet grows behind the keyboard instead of lifting off the bottom edge
  const anchoredPaddingStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(
      insets.bottom + 16,
      -keyboardHeight.value + KEYBOARD_GAP,
    ),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleDismiss}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.card,
              anchored
                ? [styles.cardAnchored, anchoredPaddingStyle]
                : styles.cardFloating,
              cardStyle,
            ]}
          >
            {anchored && <View style={styles.handle} />}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.neutral.overlay,
  },
  card: {
    backgroundColor: colors.neutral.background,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  cardFloating: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: 45,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 16,
    gap: 24,
  },
  cardAnchored: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 24,
    gap: 12,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.border,
  },
});
