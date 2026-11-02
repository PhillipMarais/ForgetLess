import type { SQLiteDatabase } from 'expo-sqlite';

import type { Settings } from '@/db/settings';

/** Home screen widgets are Android-only; elsewhere there is nothing to refresh. */
export async function refreshWidgets(_db: SQLiteDatabase, _settings: Settings, _except?: string) {}

export function useWidgetSync() {}
