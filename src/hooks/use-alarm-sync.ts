import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { subscribeToChanges, type Table } from '@/db/changes';
import type { Settings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { planAlarms } from '@/lib/alarms';
import { ForgetlessDevice } from '@/lib/device';

const WATCHED: readonly Table[] = ['tasks', 'events', 'reminders', 'occurrence_exceptions', 'alarm_skips'];

/** Hands Android every alarm due in the coming weeks, with the alarm settings. */
export async function scheduleAlarms(
  db: SQLiteDatabase,
  settings: Pick<Settings, 'alarmSoundUri' | 'alarmVibrate' | 'alarmSnoozeMinutes'>,
) {
  const device = ForgetlessDevice;
  if (!device) return;
  const alarms = await planAlarms(db);
  device.setAlarms(
    alarms.map(({ id, at, title, body }) => ({ id, at, title, body })),
    {
      soundUri: settings.alarmSoundUri,
      vibrate: settings.alarmVibrate,
      snoozeMinutes: settings.alarmSnoozeMinutes,
    },
  );
}

/**
 * Keeps Android's scheduled alarms in step with the data: re-plans them shortly after any
 * task, event or alarm changes, when alarm settings change, and whenever the app comes back
 * to the front (so repeating items always have their next dates scheduled).
 */
export function useAlarmSync() {
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const { alarmSoundUri, alarmVibrate, alarmSnoozeMinutes } = settings;

  useEffect(() => {
    if (!ForgetlessDevice) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          if (active) await scheduleAlarms(db, { alarmSoundUri, alarmVibrate, alarmSnoozeMinutes });
        } catch (error) {
          console.warn('Could not schedule alarms', error);
        }
      }, 400);
    };

    sync();
    const unsubscribe = subscribeToChanges((table) => {
      if (WATCHED.includes(table)) sync();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [db, alarmSoundUri, alarmVibrate, alarmSnoozeMinutes]);
}
