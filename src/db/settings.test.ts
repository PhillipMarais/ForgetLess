import { DEFAULT_SETTINGS, loadSettings, saveSetting } from './settings';
import { createMigratedTestDatabase } from './testing/test-database';

it('returns the defaults when nothing is saved', async () => {
  const db = await createMigratedTestDatabase();
  expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
});

it('saves and reloads settings, overwriting earlier values', async () => {
  const db = await createMigratedTestDatabase();
  await saveSetting(db, 'theme', 'dark');
  await saveSetting(db, 'theme', 'custom');
  await saveSetting(db, 'blockRepeatsUntilDone', false);

  expect(await loadSettings(db)).toEqual({
    ...DEFAULT_SETTINGS,
    theme: 'custom',
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

it("upgrades the old 'original' theme to Dark", async () => {
  const db = await createMigratedTestDatabase();
  await db.runAsync("INSERT INTO settings (key, value, updated_at) VALUES ('theme', '\"original\"', 0)");
  expect((await loadSettings(db)).theme).toBe('dark');
});

it('fills in missing or invalid custom colours from the defaults', async () => {
  const db = await createMigratedTestDatabase();
  await db.runAsync(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, 0)',
    'customColors',
    JSON.stringify({ accent: '#22a06b', text: 'not a colour' }),
  );
  const { customColors } = await loadSettings(db);
  expect(customColors.accent).toBe('#22A06B');
  expect(customColors.text).toBe(DEFAULT_SETTINGS.customColors.text);
  expect(customColors.background).toBe(DEFAULT_SETTINGS.customColors.background);
});

it('keeps valid font and alarm choices and drops unknown ones', async () => {
  const db = await createMigratedTestDatabase();
  await saveSetting(db, 'fontSet', 'editorial');
  await saveSetting(db, 'alarmSoundUri', 'content://media/internal/audio/media/12');
  await saveSetting(db, 'alarmSnoozeMinutes', 15);
  let settings = await loadSettings(db);
  expect(settings).toMatchObject({
    fontSet: 'editorial',
    alarmSoundUri: 'content://media/internal/audio/media/12',
    alarmSnoozeMinutes: 15,
  });

  const insert = (key: string, value: string) =>
    db.runAsync('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, 0)', key, value);
  await insert('fontSet', '"comic-sans"');
  await insert('alarmSnoozeMinutes', '7');
  await insert('alarmSoundUri', 'null');
  settings = await loadSettings(db);
  expect(settings.fontSet).toBe(DEFAULT_SETTINGS.fontSet);
  expect(settings.alarmSnoozeMinutes).toBe(DEFAULT_SETTINGS.alarmSnoozeMinutes);
  expect(settings.alarmSoundUri).toBeNull();
});
