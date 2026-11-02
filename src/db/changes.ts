/**
 * Minimal change feed: repositories call `notifyChange` after every write,
 * and `useLiveQuery` re-runs the queries that read from that table.
 */
export type Table =
  | 'events'
  | 'tasks'
  | 'notes'
  | 'attachments'
  | 'reminders'
  | 'occurrence_exceptions';

type Listener = (table: Table) => void;

const listeners = new Set<Listener>();

export function notifyChange(table: Table) {
  for (const listener of listeners) listener(table);
}

export function subscribeToChanges(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
