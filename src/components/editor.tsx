import { router, type Href } from 'expo-router';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** Space kept between the line being typed and the top of the keyboard. */
export const KEYBOARD_GAP = 120;

/** Scrollable, centered column for an edit screen; keeps the focused field above the keyboard. */
export function EditorLayout({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        bottomOffset={KEYBOARD_GAP}
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.four + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {children}
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

/** A text button for the navigation header, e.g. "Save". */
export function HeaderTextButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Spacing.two}
      style={({ pressed }) => [styles.headerButton, (pressed || disabled) && styles.dimmed]}>
      <ThemedText type="smallBold" themeColor="accentText" style={styles.headerButtonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * Header options that stop changing once `freeze` is called (when the editor starts saving
 * or closing). On Android, rebuilding a header's buttons while its screen is closing crashes
 * the app ("The specified child already has a parent"), and saving sets off data refreshes
 * that would otherwise do exactly that.
 */
export function useClosingHeader<T extends object>(options: T) {
  const [frozen, setFrozen] = useState<T | null>(null);
  return { options: frozen ?? options, freeze: () => setFrozen(options) };
}

/** Go back, or to `fallback` when the screen was opened directly (e.g. a reloaded web page). */
export function leaveEditor(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  headerButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerButtonText: {
    fontSize: 16,
  },
  dimmed: {
    opacity: 0.4,
  },
});
