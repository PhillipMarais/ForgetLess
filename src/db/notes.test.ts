import type { SQLiteDatabase } from 'expo-sqlite';

import { createNote, deleteNote, getNote, listNotes, setNotePinned, updateNote } from './notes';
import { createMigratedTestDatabase } from './testing/test-database';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

afterEach(() => {
  jest.useRealTimers();
});

it('creates an empty note and saves edits to it', async () => {
  const id = await createNote(db);
  expect(await getNote(db, id)).toMatchObject({ title: '', body: '', pinned: false });

  await updateNote(db, id, { title: 'Shopping', body: 'Eggs, bread' });
  expect(await getNote(db, id)).toMatchObject({ title: 'Shopping', body: 'Eggs, bread' });
});

it('lists pinned notes first, then the most recently edited', async () => {
  jest.useFakeTimers({ now: 1_000, doNotFake: ['nextTick', 'setImmediate'] });
  const older = await createNote(db);
  await updateNote(db, older, { title: 'Older', body: '' });
  jest.setSystemTime(2_000);
  const newer = await createNote(db);
  await updateNote(db, newer, { title: 'Newer', body: '' });
  jest.setSystemTime(3_000);
  const pinned = await createNote(db);
  await updateNote(db, pinned, { title: 'Pinned', body: '' });
  jest.setSystemTime(500); // pinning must win even with an older timestamp
  await setNotePinned(db, pinned, true);

  expect((await listNotes(db)).map((note) => note.title)).toEqual(['Pinned', 'Newer', 'Older']);
});

it('soft-deletes notes', async () => {
  const id = await createNote(db);
  await deleteNote(db, id);

  expect(await getNote(db, id)).toBeNull();
  expect(await listNotes(db)).toEqual([]);
});
