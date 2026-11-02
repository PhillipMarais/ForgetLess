import { migrate } from './migrations';
import { createTestDatabase } from './testing/test-database';

const SYNC_COLUMNS = ['id', 'created_at', 'updated_at', 'deleted_at'];
const TABLES = [
  'events',
  'tasks',
  'notes',
  'note_categories',
  'attachments',
  'reminders',
  'occurrence_exceptions',
  'task_steps',
  'alarm_skips',
];

async function userVersion(db: ReturnType<typeof createTestDatabase>) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row!.user_version;
}

describe('migrate', () => {
  it('creates every table on a fresh database', async () => {
    const db = createTestDatabase();
    await migrate(db);

    const rows = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    // settings is device-local, so it has no sync columns and isn't in TABLES.
    expect(rows.map((row) => row.name)).toEqual([...TABLES, 'settings'].sort());
    expect(await userVersion(db)).toBeGreaterThan(0);
  });

  it.each(TABLES)('gives %s the sync-ready columns', async (table) => {
    const db = createTestDatabase();
    await migrate(db);

    const columns = await db.getAllAsync<{ name: string; pk: number }>(
      `PRAGMA table_info(${table})`,
    );
    const names = columns.map((column) => column.name);
    expect(names).toEqual(expect.arrayContaining(SYNC_COLUMNS));
    expect(columns.find((column) => column.pk === 1)?.name).toBe('id');
  });

  it('is safe to run again on an up-to-date database', async () => {
    const db = createTestDatabase();
    await migrate(db);
    const version = await userVersion(db);

    await expect(migrate(db)).resolves.toBeUndefined();
    expect(await userVersion(db)).toBe(version);
  });

  it('refuses a database from a newer app version', async () => {
    const db = createTestDatabase();
    await db.execAsync('PRAGMA user_version = 999');

    await expect(migrate(db)).rejects.toThrow(/newer than this app supports/);
  });
});
