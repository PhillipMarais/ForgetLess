import { useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { skipMissedRepeats } from '@/db/tasks';
import { useSettings } from '@/hooks/use-settings';
import { startOfDay } from '@/lib/dates';

/**
 * When "Hold repeats until done" is off, moves missed repeating tasks on to their next date:
 * at startup, whenever the app comes back to the foreground (e.g. the next morning), and
 * as soon as the setting is switched off.
 */
export function useSkipMissedRepeats() {
  const db = useSQLiteContext();
  const { settings } = useSettings();
  const enabled = !settings.blockRepeatsUntilDone;

  useEffect(() => {
    if (!enabled) return;
    const run = () => {
      skipMissedRepeats(db, startOfDay()).catch((error) =>
        console.warn('Could not move missed repeating tasks', error),
      );
    };
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, [db, enabled]);
}
