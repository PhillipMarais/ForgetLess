import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Toast = {
  id: number;
  message: string;
  /** A button on the toast, e.g. Undo. */
  action?: { label: string; run: () => void };
};

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();
let nextId = 1;

/**
 * Shows a short message at the bottom of the screen, like the phone's own toasts
 * ("Alarm set for 2 hours from now"). With an action it stays a little longer.
 */
export function showToast(message: string, action?: Toast['action']) {
  const toast = { id: nextId++, message, action };
  for (const listener of listeners) listener(toast);
}

/** Draws toasts; rendered once, above the app's screens. */
export function ToastHost() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => setToast(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.action ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    // Sits above the tab bar so it never covers the tabs' labels.
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 88 }]}>
      <Animated.View
        key={toast.id}
        entering={FadeInDown.duration(200)}
        exiting={FadeOutDown.duration(200)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { backgroundColor: colors.text }]}>
        <ThemedText type="small" style={[styles.message, { color: colors.background }]}>
          {toast.message}
        </ThemedText>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={Spacing.two}
            onPress={() => {
              toast.action?.run();
              setToast(null);
            }}>
            <ThemedText type="smallBold" style={{ color: colors.accent }}>
              {toast.action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 480,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    // A soft shadow so it reads as floating above the screen.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
