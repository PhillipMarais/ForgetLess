import { useEffect } from 'react';
import { AppState } from 'react-native';

import { notifyChange, type Table } from '@/db/changes';
import { useAppTheme } from '@/hooks/use-theme';
import { ForgetlessDevice } from '@/lib/device';

const ALL_TABLES: readonly Table[] = [
  'events',
  'tasks',
  'notes',
  'note_categories',
  'attachments',
  'reminders',
  'occurrence_exceptions',
  'task_steps',
  'alarm_skips',
];

/**
 * Hands the theme's colours to the Android side (alarm screen, widget popups), and reloads
 * every list when the app comes back to the front: widgets and their popups add and tick off
 * things while the app is in the background.
 */
export function useNativeSync() {
  const theme = useAppTheme();
  const { colors } = theme;

  useEffect(() => {
    ForgetlessDevice?.setAppearance({
      background: colors.background,
      surface: colors.backgroundElement,
      text: colors.text,
      textSecondary: colors.textSecondary,
      accent: colors.accent,
      onAccent: colors.onAccent,
      border: colors.border,
      danger: colors.danger,
      dark: theme.dark,
    });
  }, [colors, theme.dark]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') for (const table of ALL_TABLES) notifyChange(table);
    });
    return () => subscription.remove();
  }, []);
}
