import { router, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** Scrollable, centered column for an edit screen; keeps the focused field above the keyboard. */
export function EditorLayout({ children }: PropsWithChildren) {
  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        bottomOffset={Spacing.four}
        contentContainerStyle={styles.content}
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
      <ThemedText type="smallBold" themeColor="accent" style={styles.headerButtonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
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
