import type { SQLiteDatabase } from 'expo-sqlite';

import { now } from './ids';

/** Every user setting, with its default. Add new settings here. */
export const DEFAULT_SETTINGS = {
  /** 'system' follows the phone's light/dark mode. */
  theme: 'system' as ThemeSetting,
  /**
   * On: a repeating task that is missed stays overdue, and its next dates wait until it is
   * ticked off. Off: missed dates are skipped and the task moves on to its next date.
   */
  blockRepeatsUntilDone: true,
  calendarView: 'month' as CalendarView,
};

export type ThemeSetting = 'system' | 'light' | 'dark' | 'original';
export type CalendarView = 'day' | 'week' | 'month';
export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

/** All settings, falling back to defaults for unset or unreadable values. */
export async function loadSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (!(row.key in DEFAULT_SETTINGS)) continue;
    try {
      const value: unknown = JSON.parse(row.value);
      const key = row.key as SettingKey;
      if (typeof value === typeof DEFAULT_SETTINGS[key]) {
        (settings as Record<SettingKey, unknown>)[key] = value;
      }
    } catch {
      // Ignore a corrupt value; the default applies.
    }
  }
  return settings;
}

export async function saveSetting<K extends SettingKey>(
  db: SQLiteDatabase,
  key: K,
  value: Settings[K],
) {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    now(),
  );
}
