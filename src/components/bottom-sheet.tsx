import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SheetContextValue = {
  offset: SharedValue<number>;
  height: SharedValue<number>;
  /** Slides the sheet away, then runs `then` (default: the sheet's onClose). */
  close: (then?: () => void) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

/** Slides the sheet out, then runs `then` (or closes it); for Cancel / Done buttons inside. */
export function useSheetClose() {
  const context = useContext(SheetContext);
  return context?.close ?? ((then?: () => void) => then?.());
}

type BottomSheetProps = PropsWithChildren<{
  onClose: () => void;
  /** Read by screen readers for the backdrop. */
  closeLabel?: string;
}>;

/**
 * A sheet that slides up from the bottom, like the phone's own. Drag it down by any
 * `SheetDragArea` and it follows your finger; let go past a third of its height (or flick)
 * and it slides away, otherwise it springs back.
 */
export function BottomSheet({ onClose, closeLabel = 'Close', children }: BottomSheetProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const offset = useSharedValue(window.height);
  const height = useSharedValue(window.height);

  useEffect(() => {
    offset.set(withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [offset]);

  const close = useCallback(
    (then?: () => void) => {
      const done = then ?? onClose;
      offset.set(
        withTiming(height.get(), { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(done);
        }),
      );
    },
    [height, offset, onClose],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - offset.get() / Math.max(1, height.get())),
  }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel={closeLabel} />
        </Animated.View>
        <SheetContext.Provider value={{ offset, height, close }}>
          <Animated.View
            onLayout={(event) => height.set(event.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                paddingBottom: Spacing.three + insets.bottom,
              },
              sheetStyle,
            ]}
            accessibilityViewIsModal>
            {children}
          </Animated.View>
        </SheetContext.Provider>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Part of the sheet you can drag it down by. The handle bar is drawn when `handle` is set. */
export function SheetDragArea({
  handle,
  style,
  children,
}: PropsWithChildren<{ handle?: boolean; style?: ViewStyle }>) {
  const colors = useTheme();
  const context = useContext(SheetContext);
  const offset = context?.offset;
  const height = context?.height;
  const close = context?.close;

  const pan = usePanGesture({
    enabled: context !== null,
    activeOffsetY: [-10, 10],
    onUpdate: (event) => {
      'worklet';
      // Dragging up stretches a little, like the phone's sheets.
      offset?.set(event.translationY > 0 ? event.translationY : event.translationY / 6);
    },
    onDeactivate: (event) => {
      'worklet';
      if (!offset || !height) return;
      if (offset.get() > height.get() / 3 || event.velocityY > 900) {
        if (close) scheduleOnRN(close);
      } else {
        offset.set(withSpring(0, { damping: 22, stiffness: 260 }));
      }
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.dragArea, style]}>
        {handle ? <View style={[styles.handle, { backgroundColor: colors.border }]} /> : null}
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.large * 1.5,
    borderTopRightRadius: Radius.large * 1.5,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  dragArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.three,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: Spacing.two,
  },
});
