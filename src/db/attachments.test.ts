import type { SQLiteDatabase } from 'expo-sqlite';

import {
  addAttachment,
  clearDeletedAttachmentUris,
  deleteAttachment,
  listAttachments,
  listDeletedAttachmentUris,
  PDF_MIME,
  setAttachmentOrder,
  type NewAttachment,
} from './attachments';
import { createEvent, deleteEvent, getEvent, listOccurrences } from './events';
import { createNote, deleteNote, getNote } from './notes';
import { createTask, deleteTask, getTask, listTasks } from './tasks';
import { createMigratedTestDatabase } from './testing/test-database';

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

afterEach(() => {
  jest.useRealTimers();
});

function picture(ownerType: NewAttachment['ownerType'], ownerId: string, name: string): NewAttachment {
  return {
    ownerType,
    ownerId,
    uri: `file:///attachments/${name}.jpg`,
    mimeType: 'image/jpeg',
    width: 1600,
    height: 1200,
    byteSize: 250_000,
  };
}

it('lists an owner’s pictures in the order they were added', async () => {
  jest.useFakeTimers({ now: 1_000, doNotFake: ['nextTick', 'setImmediate'] });
  const taskId = await createTask(db, { title: 'Fix tap' });
  const otherId = await createTask(db, { title: 'Other' });
  await addAttachment(db, picture('task', taskId, 'first'));
  jest.setSystemTime(2_000);
  await addAttachment(db, picture('task', taskId, 'second'));
  await addAttachment(db, picture('task', otherId, 'elsewhere'));
  await addAttachment(db, picture('note', taskId, 'wrong-type'));

  const uris = (await listAttachments(db, 'task', taskId)).map((a) => a.uri);
  expect(uris).toEqual(['file:///attachments/first.jpg', 'file:///attachments/second.jpg']);
});

it('stores every field', async () => {
  const taskId = await createTask(db, { title: 'Fix tap' });
  const id = await addAttachment(db, picture('task', taskId, 'tap'));

  expect(await listAttachments(db, 'task', taskId)).toEqual([
    expect.objectContaining({ id, ...picture('task', taskId, 'tap'), createdAt: expect.any(Number) }),
  ]);
});

it('keeps a saved order, and the first picture becomes the cover', async () => {
  const taskId = await createTask(db, { title: 'Fix tap' });
  const a = await addAttachment(db, picture('task', taskId, 'a'));
  const b = await addAttachment(db, picture('task', taskId, 'b'));
  const c = await addAttachment(db, picture('task', taskId, 'c'));
  expect((await getTask(db, taskId))?.coverUri).toBe('file:///attachments/a.jpg');

  await setAttachmentOrder(db, [c, a, b]);

  expect((await listAttachments(db, 'task', taskId)).map((x) => x.id)).toEqual([c, a, b]);
  expect((await getTask(db, taskId))?.coverUri).toBe('file:///attachments/c.jpg');
});

it('adds new pictures after the existing ones', async () => {
  const taskId = await createTask(db, { title: 'Fix tap' });
  const a = await addAttachment(db, picture('task', taskId, 'a'));
  const b = await addAttachment(db, picture('task', taskId, 'b'));
  await setAttachmentOrder(db, [b, a]);
  const c = await addAttachment(db, picture('task', taskId, 'c'));

  expect((await listAttachments(db, 'task', taskId)).map((x) => x.id)).toEqual([b, a, c]);
});

it('has no cover when there are no pictures', async () => {
  const taskId = await createTask(db, { title: 'Plain' });
  expect(await getTask(db, taskId)).toMatchObject({ attachmentCount: 0, coverUri: null });
});

it('soft-deletes a picture', async () => {
  const taskId = await createTask(db, { title: 'Fix tap' });
  const id = await addAttachment(db, picture('task', taskId, 'tap'));
  await deleteAttachment(db, id);

  expect(await listAttachments(db, 'task', taskId)).toEqual([]);
  expect(await listDeletedAttachmentUris(db)).toEqual(['file:///attachments/tap.jpg']);
});

it('counts pictures on tasks, notes and events', async () => {
  const taskId = await createTask(db, { title: 'Fix tap' });
  const noteId = await createNote(db);
  const start = new Date(2026, 10, 2, 9).getTime();
  const eventId = await createEvent(db, {
    title: 'Plumber',
    notes: null,
    startAt: start,
    endAt: start + 3_600_000,
    allDay: false,
    rrule: null,
  });
  await addAttachment(db, picture('task', taskId, 'a'));
  await addAttachment(db, picture('task', taskId, 'b'));
  const deletedId = await addAttachment(db, picture('task', taskId, 'c'));
  await deleteAttachment(db, deletedId);
  await addAttachment(db, picture('note', noteId, 'd'));
  await addAttachment(db, picture('event', eventId, 'e'));

  expect((await getTask(db, taskId))?.attachmentCount).toBe(2);
  expect((await listTasks(db))[0].attachmentCount).toBe(2);
  expect((await getNote(db, noteId))?.attachmentCount).toBe(1);
  expect((await getEvent(db, eventId))?.attachmentCount).toBe(1);
  expect((await listOccurrences(db, start, start + 1))[0].attachmentCount).toBe(1);
});

it.each([
  ['task', async () => createTask(db, { title: 'T' }), (id: string) => deleteTask(db, id)],
  ['note', async () => createNote(db), (id: string) => deleteNote(db, id)],
  [
    'event',
    async () =>
      createEvent(db, { title: 'E', notes: null, startAt: 0, endAt: 1, allDay: false, rrule: null }),
    (id: string) => deleteEvent(db, id),
  ],
] as const)('deleting a %s deletes its pictures', async (ownerType, create, remove) => {
  const ownerId = await create();
  await addAttachment(db, picture(ownerType, ownerId, 'pic'));
  await remove(ownerId);

  expect(await listAttachments(db, ownerType, ownerId)).toEqual([]);
  expect(await listDeletedAttachmentUris(db)).toEqual(['file:///attachments/pic.jpg']);
});

it('forgets the files of deleted pictures once cleared, but keeps the rows', async () => {
  const taskId = await createTask(db, { title: 'Fix tap' });
  const id = await addAttachment(db, picture('task', taskId, 'tap'));
  await deleteAttachment(db, id);

  await clearDeletedAttachmentUris(db, ['file:///attachments/tap.jpg']);

  expect(await listDeletedAttachmentUris(db)).toEqual([]);
  const row = await db.getFirstAsync<{ uri: string }>('SELECT uri FROM attachments WHERE id = ?', id);
  expect(row?.uri).toBe('');
});

it('keeps PDFs apart from pictures: not a cover, not in the picture count', async () => {
  const noteId = await createNote(db, { title: 'Manual', body: '' });
  await addAttachment(db, {
    ownerType: 'note',
    ownerId: noteId,
    uri: 'file:///attachments/manual.pdf',
    mimeType: PDF_MIME,
    width: null,
    height: null,
    byteSize: 90_000,
    fileName: 'Manual.pdf',
  });
  await addAttachment(db, picture('note', noteId, 'photo'));

  const note = await getNote(db, noteId);
  expect(note).toMatchObject({ attachmentCount: 1, documentCount: 1, coverUri: 'file:///attachments/photo.jpg' });
  expect((await listAttachments(db, 'note', noteId)).map((a) => a.uri)).toEqual(['file:///attachments/photo.jpg']);
  expect(await listAttachments(db, 'note', noteId, 'documents')).toEqual([
    expect.objectContaining({ fileName: 'Manual.pdf', mimeType: PDF_MIME }),
  ]);
});
