import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useControlSize, useTheme } from '@/hooks/use-theme';

type DictationButtonProps = {
  listening: boolean;
  partial: string;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  /** e.g. "Speak to add notes". */
  label?: string;
};

/**
 * "Speak" button for speech to text. While listening it turns into a pulsing Stop button and
 * shows the words being heard.
 */
export function DictationButton({
  listening,
  partial,
  error,
  onStart,
  onStop,
  label = 'Speak',
}: DictationButtonProps) {
  const theme = useTheme();
  const paddingVertical = useControlSize(Spacing.two);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (listening) pulse.set(withRepeat(withTiming(0.3, { duration: 700 }), -1, true));
    else {
      cancelAnimation(pulse);
      pulse.set(1);
    }
  }, [listening, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? 'Stop listening' : label}
        onPress={listening ? onStop : onStart}
        style={({ pressed }) => [
          styles.button,
          { paddingVertical },
          listening
            ? { backgroundColor: theme.accent, borderColor: theme.accent }
            : { borderColor: theme.accentText },
          pressed && styles.pressed,
        ]}>
        {listening ? (
          <Animated.View style={[styles.dot, { backgroundColor: theme.onAccent }, dotStyle]} />
        ) : (
          <Icon name={Icons.mic} size={20} color="accentText" />
        )}
        <ThemedText type="smallBold" themeColor={listening ? 'onAccent' : 'accentText'}>
          {listening ? 'Listening… tap to stop' : label}
        </ThemedText>
      </Pressable>
      {listening && partial ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.partial} accessibilityLiveRegion="polite">
          {partial}
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  partial: {
    fontStyle: 'italic',
  },
});
