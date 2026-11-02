import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema conventions (keep them in every new table so sync can be added later):
 * - `id` is a UUID string, never an autoincrement integer.
 * - `created_at`, `updated_at`, `deleted_at` are epoch milliseconds; rows are soft-deleted.
 * - Instants are epoch milliseconds plus the IANA `time_zone` they were created in.
 *   All-day items store local midnight of their day in that time zone.
 * - Repeating items store an RRULE string; per-occurrence edits live in `occurrence_exceptions`.
 *
 * Exception: `settings` is a device-local key/value table (no sync columns); preferences
 * describe this device, not the user's data.
 *
 * Migrations are append-only: never edit a migration that has shipped, add a new one.
 * The index of a migration + 1 is the `PRAGMA user_version` it brings the database to.
 */
const MIGRATIONS: readonly string[] = [
  // 1: initial schema
  `
  CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    location TEXT,
    start_at INTEGER NOT NULL,
    end_at INTEGER NOT NULL,
    all_day INTEGER NOT NULL DEFAULT 0,
    time_zone TEXT NOT NULL,
    rrule TEXT,
    color TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX events_start_at ON events (start_at) WHERE deleted_at IS NULL;

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    due_at INTEGER,
    due_all_day INTEGER NOT NULL DEFAULT 0,
    time_zone TEXT NOT NULL,
    rrule TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    sort_order REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX tasks_due_at ON tasks (due_at) WHERE deleted_at IS NULL;

  CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  CREATE TABLE attachments (
    id TEXT PRIMARY KEY NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('event', 'task', 'note')),
    owner_id TEXT NOT NULL,
    uri TEXT NOT NULL,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    byte_size INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX attachments_owner ON attachments (owner_type, owner_id);

  CREATE TABLE reminders (
    id TEXT PRIMARY KEY NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('event', 'task')),
    owner_id TEXT NOT NULL,
    offset_minutes INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL DEFAULT 'notification' CHECK (kind IN ('notification', 'alarm')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );
  CREATE INDEX reminders_owner ON reminders (owner_type, owner_id);

  CREATE TABLE occurrence_exceptions (
    id TEXT PRIMARY KEY NOT NULL,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('event', 'task')),
    owner_id TEXT NOT NULL,
    original_start INTEGER NOT NULL,
    cancelled INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    title TEXT,
    notes TEXT,
    start_at INTEGER,
    end_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER,
    UNIQUE (owner_type, owner_id, original_start)
  );
  `,
  // 2: user settings; picture order (the first picture is the cover)
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  ALTER TABLE attachments ADD COLUMN sort_order REAL NOT NULL DEFAULT 0;
  UPDATE attachments SET sort_order = created_at;
  `,
  // 3: note folders ("categories"), each with an optional icon picture
  `
  CREATE TABLE note_categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon_uri TEXT,
    sort_order REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );

  ALTER TABLE notes ADD COLUMN category_id TEXT;
  CREATE INDEX notes_category_id ON notes (category_id) WHERE deleted_at IS NULL;
  `,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > MIGRATIONS.length) {
    throw new Error(
      `Database is at schema version ${current}, newer than this app supports (${MIGRATIONS.length}).`,
    );
  }

  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
