import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createNote,
  deleteNote,
  deleteNotes,
  getNote,
  listMainNotes,
  listNotes,
  setNotePinned,
  setNotesPinned,
  setNotesVoice,
  updateNote,
} from './notes';
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

it('creates a note with its content in one go', async () => {
  const id = await createNote(db, { title: 'Ideas', body: 'Paint the fence', pinned: true });
  expect(await getNote(db, id)).toMatchObject({ title: 'Ideas', body: 'Paint the fence', pinned: true });
});

it('only changes the pin when one is given', async () => {
  const id = await createNote(db, { title: 'A', body: '', pinned: true });
  await updateNote(db, id, { title: 'B', body: '' });
  expect(await getNote(db, id)).toMatchObject({ title: 'B', pinned: true });

  await updateNote(db, id, { title: 'B', body: '', pinned: false });
  expect((await getNote(db, id))?.pinned).toBe(false);
});

it('pins and deletes several notes at once', async () => {
  const a = await createNote(db, { title: 'A', body: '' });
  const b = await createNote(db, { title: 'B', body: '' });
  const c = await createNote(db, { title: 'C', body: '' });

  await setNotesPinned(db, [a, c], true);
  expect((await listNotes(db)).filter((n) => n.pinned).map((n) => n.title).sort()).toEqual(['A', 'C']);

  await deleteNotes(db, [a, b]);
  expect((await listNotes(db)).map((n) => n.title)).toEqual(['C']);
});

it('lists voice notes in their own section, unless pinned', async () => {
  await createNote(db, { title: 'Typed', body: 'a' });
  const spoken = await createNote(db, { title: 'Spoken', body: 'b', voice: true });
  let main = await listMainNotes(db);
  expect(main.voice.map((note) => note.title)).toEqual(['Spoken']);
  expect(main.loose.map((note) => note.title)).toEqual(['Typed']);
  expect((await getNote(db, spoken))?.voice).toBe(true);

  await setNotePinned(db, spoken, true);
  main = await listMainNotes(db);
  expect(main.voice).toEqual([]);
  expect(main.pinned.map((note) => note.title)).toEqual(['Spoken']);
});

it('turns a voice note into an ordinary note in the main list', async () => {
  const id = await createNote(db, { title: 'Spoken', body: 'Buy milk', voice: true });
  expect((await listMainNotes(db)).voice.map((note) => note.id)).toEqual([id]);

  await setNotesVoice(db, [id], false);
  const main = await listMainNotes(db);
  expect(main.voice).toEqual([]);
  expect(main.loose.map((note) => note.id)).toEqual([id]);
  expect(await getNote(db, id)).toMatchObject({ title: 'Spoken', body: 'Buy milk', voice: false });
});
