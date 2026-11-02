import type { SQLiteDatabase } from 'expo-sqlite';

import { FONT_SET_IDS, type FontSetId } from '@/constants/fonts';
import { DEFAULT_CUSTOM_COLORS, sanitizeCustomColors, type CustomColors } from '@/lib/custom-theme';

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
  /** Colours for the Custom theme. */
  customColors: DEFAULT_CUSTOM_COLORS as CustomColors,
  /** Fonts for every theme; see FONT_SETS in constants/fonts. */
  fontSet: 'brand' as FontSetId,
  /** One of the phone's alarm sounds; null is the phone's default alarm sound. */
  alarmSoundUri: null as string | null,
  /** Shown in settings, so the list of sounds needn't be loaded to name the choice. */
  alarmSoundName: 'Phone default',
  alarmVibrate: true,
  alarmSnoozeMinutes: 10,
};

export const SNOOZE_CHOICES = [5, 10, 15, 30] as const;

export type ThemeSetting = 'system' | 'light' | 'dark' | 'custom';
export type CalendarView = 'day' | 'week' | 'month';

const THEME_SETTINGS: readonly string[] = ['system', 'light', 'dark', 'custom'];
const CALENDAR_VIEWS: readonly string[] = ['day', 'week', 'month'];

/**
 * Checks a stored value and upgrades old ones; returns undefined to fall back to the default.
 * 'original' was the name of today's Dark theme before 2026-11-02.
 */
function normalize(key: SettingKey, value: unknown): unknown {
  if (key === 'theme') {
    if (value === 'original') return 'dark';
    return THEME_SETTINGS.includes(value as string) ? value : undefined;
  }
  if (key === 'calendarView') return CALENDAR_VIEWS.includes(value as string) ? value : undefined;
  if (key === 'customColors') return value && typeof value === 'object' ? sanitizeCustomColors(value) : undefined;
  if (key === 'fontSet') return FONT_SET_IDS.includes(value as FontSetId) ? value : undefined;
  if (key === 'alarmSoundUri') return value === null || typeof value === 'string' ? value : undefined;
  if (key === 'alarmSnoozeMinutes') {
    return (SNOOZE_CHOICES as readonly unknown[]).includes(value) ? value : undefined;
  }
  return typeof value === typeof DEFAULT_SETTINGS[key] ? value : undefined;
}

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

/** All settings, falling back to defaults for unset or unreadable values. */
export async function loadSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (!(row.key in DEFAULT_SETTINGS)) continue;
    try {
      const key = row.key as SettingKey;
      const value = normalize(key, JSON.parse(row.value));
      if (value !== undefined) (settings as Record<SettingKey, unknown>)[key] = value;
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
