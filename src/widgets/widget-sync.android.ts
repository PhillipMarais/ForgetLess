import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { subscribeToChanges, type Table } from '@/db/changes';
import type { Settings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';

import { renderWidgetByName, WIDGET_NAMES } from './widget-render';

/** Changes to these tables show on some widget. */
const WATCHED: readonly Table[] = [
  'events',
  'tasks',
  'notes',
  'occurrence_exceptions',
  'task_steps',
];

/** Redraws every widget on the home screen (except `except`, which is being drawn already). */
export async function refreshWidgets(db: SQLiteDatabase, settings: Settings, except?: string) {
  for (const name of WIDGET_NAMES) {
    if (name === except) continue;
    await requestWidgetUpdate({
      widgetName: name,
      renderWidget: (info) => renderWidgetByName(name, info, db, settings),
    });
  }
}

/**
 * Keeps home screen widgets in step with the app: redraws them shortly after data or the
 * theme changes, and when the app goes to the background (e.g. after midnight passes).
 */
export function useWidgetSync() {
  const db = useSQLiteContext();
  const { settings } = useSettings();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        refreshWidgets(db, settings).catch((error) => console.warn('Could not update widgets', error));
      }, 800);
    };
    sync();
    const unsubscribe = subscribeToChanges((table) => {
      if (WATCHED.includes(table)) sync();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') sync();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
    };
  }, [db, settings]);
}
