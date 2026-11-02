import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createCategory,
  deleteCategories,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from './categories';
import {
  createNote,
  getNote,
  listMainNotes,
  listNotesInCategory,
  setNotesCategory,
  updateNote,
} from './notes';
import { createMigratedTestDatabase } from './testing/test-database';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

it('creates, renames and lists categories alphabetically with their note counts', async () => {
  const work = await createCategory(db, { name: ' Work ', iconUri: null });
  const home = await createCategory(db, { name: 'home', iconUri: 'file:///icon.jpg' });
  await createNote(db, { title: 'A', body: '', categoryId: work });
  await createNote(db, { title: 'B', body: '', categoryId: work });

  expect((await listCategories(db)).map((c) => [c.name, c.noteCount, c.iconUri])).toEqual([
    ['home', 0, 'file:///icon.jpg'],
    ['Work', 2, null],
  ]);

  await updateCategory(db, home, { name: 'Home', iconUri: null });
  expect(await getCategory(db, home)).toMatchObject({ name: 'Home', iconUri: null });
});

it('splits the main list into pinned notes, and loose notes not in a category', async () => {
  const work = await createCategory(db, { name: 'Work', iconUri: null });
  await createNote(db, { title: 'Loose', body: '' });
  await createNote(db, { title: 'Filed', body: '', categoryId: work });
  await createNote(db, { title: 'Pinned and filed', body: '', categoryId: work, pinned: true });
  await createNote(db, { title: 'Pinned', body: '', pinned: true });

  const main = await listMainNotes(db);
  expect(main.pinned.map((n) => n.title).sort()).toEqual(['Pinned', 'Pinned and filed']);
  expect(main.loose.map((n) => n.title)).toEqual(['Loose']);
  expect((await listNotesInCategory(db, work)).map((n) => n.title)).toEqual([
    'Pinned and filed',
    'Filed',
  ]);
});

it('moves notes in and out of categories, alone or several at once', async () => {
  const work = await createCategory(db, { name: 'Work', iconUri: null });
  const a = await createNote(db, { title: 'A', body: '' });
  const b = await createNote(db, { title: 'B', body: '' });

  await setNotesCategory(db, [a, b], work);
  expect(await listNotesInCategory(db, work)).toHaveLength(2);

  await updateNote(db, a, { title: 'A', body: '', categoryId: null });
  expect((await getNote(db, a))?.categoryId).toBeNull();

  // Leaving categoryId out of an update keeps the category.
  await updateNote(db, b, { title: 'B2', body: '' });
  expect((await getNote(db, b))?.categoryId).toBe(work);
});

it('deleting a category keeps its notes and moves them back to the main list', async () => {
  const work = await createCategory(db, { name: 'Work', iconUri: null });
  await createNote(db, { title: 'Filed', body: '', categoryId: work });

  await deleteCategory(db, work);

  expect(await listCategories(db)).toEqual([]);
  expect((await listMainNotes(db)).loose.map((n) => n.title)).toEqual(['Filed']);
});

it('deletes several categories at once and keeps their notes', async () => {
  const work = await createCategory(db, { name: 'Work', iconUri: null });
  const home = await createCategory(db, { name: 'Home', iconUri: null });
  const keep = await createCategory(db, { name: 'Keep', iconUri: null });
  await createNote(db, { title: 'Filed', body: '', categoryId: work });

  await deleteCategories(db, [work, home]);

  expect((await listCategories(db)).map((c) => c.id)).toEqual([keep]);
  expect((await listMainNotes(db)).loose.map((n) => n.title)).toEqual(['Filed']);
});
