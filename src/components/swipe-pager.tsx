import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { slideIn } from '@/components/screen';

/** How far (px) a swipe must travel to change page. */
const THRESHOLD = 60;

type SwipePagerProps = PropsWithChildren<{
  /** Called with -1 for a swipe to the right (previous) and +1 for left (next). */
  onSwipe: (direction: -1 | 1) => void;
  /** Identifies the period shown; when it changes the new content slides in. */
  pageKey: string;
  /** Which way the last change went: +1 next (slides in from the right), -1 previous. */
  direction: -1 | 0 | 1;
}>;

/**
 * Lets the user swipe sideways to go to the previous or next period. The content follows
 * the finger a little for feedback. Only clearly horizontal drags count, so vertical
 * scrolling inside keeps working.
 */
export function SwipePager({ onSwipe, pageKey, direction, children }: SwipePagerProps) {
  const offset = useSharedValue(0);

  const pan = usePanGesture({
    activeOffsetX: [-20, 20],
    failOffsetY: [-15, 15],
    onUpdate: (event) => {
      'worklet';
      offset.set(event.translationX * 0.35);
    },
    onDeactivate: (event) => {
      'worklet';
      const swiped = Math.abs(event.translationX) >= THRESHOLD;
      // On a page change the new page slides in, so drop the finger offset at once.
      if (swiped) offset.set(0);
      if (event.translationX <= -THRESHOLD) scheduleOnRN(onSwipe, 1);
      else if (event.translationX >= THRESHOLD) scheduleOnRN(onSwipe, -1);
    },
    onFinalize: () => {
      'worklet';
      offset.set(withSpring(0, { damping: 20, stiffness: 220 }));
    },
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, style]}>
        <Animated.View key={pageKey} entering={slideIn(direction)} style={styles.fill}>
          {children}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
