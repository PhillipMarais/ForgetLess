import { DEFAULT_SETTINGS, loadSettings, saveSetting } from './settings';
import { createMigratedTestDatabase } from './testing/test-database';

it('returns the defaults when nothing is saved', async () => {
  const db = await createMigratedTestDatabase();
  expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
});

it('saves and reloads settings, overwriting earlier values', async () => {
  const db = await createMigratedTestDatabase();
  await saveSetting(db, 'theme', 'dark');
  await saveSetting(db, 'theme', 'original');
  await saveSetting(db, 'blockRepeatsUntilDone', false);

  expect(await loadSettings(db)).toEqual({
    ...DEFAULT_SETTINGS,
    theme: 'original',
    blockRepeatsUntilDone: false,
  });
});

it('ignores unknown keys and values of the wrong type or unreadable JSON', async () => {
  const db = await createMigratedTestDatabase();
  const insert = (key: string, value: string) =>
    db.runAsync('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, 0)', key, value);
  await insert('somethingOld', '"x"');
  await insert('blockRepeatsUntilDone', '"yes"');
  await insert('theme', '{not json');

  expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
});
