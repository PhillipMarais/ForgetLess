import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { subscribeToChanges, type Table } from '@/db/changes';
import { useSettings } from '@/hooks/use-settings';
import { planAlarms } from '@/lib/alarms';
import { ForgetlessDevice } from '@/lib/device';

const WATCHED: readonly Table[] = ['tasks', 'events', 'reminders', 'occurrence_exceptions'];

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
    const device = ForgetlessDevice;
    if (!device) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const alarms = await planAlarms(db);
          if (!active) return;
          device.setAlarms(alarms, {
            soundUri: alarmSoundUri,
            vibrate: alarmVibrate,
            snoozeMinutes: alarmSnoozeMinutes,
          });
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
