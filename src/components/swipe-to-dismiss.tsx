import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SwipeToDismissProps = PropsWithChildren<{
  /** Off: the row doesn't move. */
  enabled: boolean;
  onDismiss: () => void;
  /** Shown behind the row as it slides away, e.g. "Clear". */
  hint: string;
}>;

/**
 * Swipe a row to the left to clear it, like a notification. Past about a third of its width
 * (or with a quick flick) it slides out and `onDismiss` runs; otherwise it springs back.
 */
export function SwipeToDismiss({ enabled, onDismiss, hint, children }: SwipeToDismissProps) {
  const theme = useTheme();
  const offset = useSharedValue(0);
  const width = useSharedValue(0);

  const pan = usePanGesture({
    enabled,
    activeOffsetX: [-15, 15],
    failOffsetY: [-12, 12],
    onUpdate: (event) => {
      'worklet';
      offset.set(Math.min(0, event.translationX));
    },
    onDeactivate: (event) => {
      'worklet';
      const rowWidth = width.get();
      if (offset.get() < -rowWidth * 0.33 || event.velocityX < -900) {
        offset.set(
          withTiming(-rowWidth, { duration: 160 }, (finished) => {
            if (finished) scheduleOnRN(onDismiss);
          }),
        );
      } else {
        offset.set(withSpring(0, { damping: 20, stiffness: 220 }));
      }
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, -offset.get() / Math.max(1, width.get() * 0.33)),
  }));

  return (
    <View onLayout={(event) => width.set(event.nativeEvent.layout.width)}>
      {enabled ? (
        <Animated.View
          style={[styles.behind, { backgroundColor: theme.backgroundSelected }, hintStyle]}
          aria-hidden>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {hint}
          </ThemedText>
          <Icon name={Icons.swipe} size={20} color="textSecondary" />
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[enabled && { backgroundColor: theme.background }, rowStyle]}
          accessibilityActions={enabled ? [{ name: 'dismiss', label: hint }] : undefined}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'dismiss') onDismiss();
          }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  behind: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
