import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useEffectEvent, useState } from 'react';

import { subscribeToChanges, type Table } from './changes';

type QueryState<T> = { data: T | undefined; error: Error | undefined };

/**
 * Runs `load` and re-runs it whenever one of `tables` changes.
 * `key` must change whenever the query's inputs change (e.g. include the id being loaded).
 */
export function useLiveQuery<T>(
  tables: readonly Table[],
  key: string,
  load: (db: SQLiteDatabase) => Promise<T>,
): QueryState<T> {
  const db = useSQLiteContext();
  const [state, setState] = useState<QueryState<T>>({ data: undefined, error: undefined });
  const runLoad = useEffectEvent(() => load(db));
  const tableKey = tables.join(',');

  useEffect(() => {
    let active = true;
    const watched = tableKey.split(',');

    const refresh = () => {
      runLoad().then(
        (data) => active && setState({ data, error: undefined }),
        (error: unknown) =>
          active &&
          setState((prev) => ({
            data: prev.data,
            error: error instanceof Error ? error : new Error(String(error)),
          })),
      );
    };

    refresh();
    const unsubscribe = subscribeToChanges((table) => {
      if (watched.includes(table)) refresh();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [db, tableKey, key]);

  return state;
}
