import type { SQLiteDatabase } from 'expo-sqlite';

import { addAttachment, listAttachments, listDeletedAttachmentUris } from '@/db/attachments';
import { createTask } from '@/db/tasks';
import { createMigratedTestDatabase } from '@/db/testing/test-database';

import type { PreparedPhoto } from './photo-compress';
import { deletePhotoFile, storePhoto } from './photo-storage';
import { draftPhotosFrom, purgeDeletedPhotos, savePhotoChanges, type DraftPhoto } from './photos';

// The storage layer touches the device file system; here it just records what it was asked.
jest.mock('./photo-storage', () => ({
  preparePhoto: jest.fn(),
  storePhoto: jest.fn(async (_photo: unknown, id: string) => `file:///attachments/${id}.jpg`),
  deletePhotoFile: jest.fn(),
}));

let db: SQLiteDatabase;
let taskId: string;

beforeEach(async () => {
  jest.clearAllMocks();
  db = await createMigratedTestDatabase();
  taskId = await createTask(db, { title: 'Fix tap' });
});

function prepared(name: string): DraftPhoto {
  const photo: PreparedPhoto = {
    uri: `file:///cache/${name}.jpg`,
    width: 1600,
    height: 900,
    mimeType: 'image/jpeg',
    byteSize: 200_000,
  };
  return { key: name, uri: photo.uri, prepared: photo };
}

async function existing(name: string) {
  await addAttachment(db, {
    ownerType: 'task',
    ownerId: taskId,
    uri: `file:///attachments/${name}.jpg`,
    mimeType: 'image/jpeg',
    width: 100,
    height: 100,
    byteSize: 1_000,
  });
  return (await listAttachments(db, 'task', taskId)).find((a) => a.uri.includes(name))!;
}

describe('savePhotoChanges', () => {
  it('stores new pictures and records them against the owner', async () => {
    await savePhotoChanges(db, 'task', taskId, [], [prepared('new')]);

    const [attachment] = await listAttachments(db, 'task', taskId);
    expect(storePhoto).toHaveBeenCalledWith(prepared('new').prepared, attachment.id);
    expect(attachment).toMatchObject({
      uri: `file:///attachments/${attachment.id}.jpg`,
      width: 1600,
      height: 900,
      byteSize: 200_000,
    });
  });

  it('removes pictures dropped from the draft, deleting their files', async () => {
    const keep = await existing('keep');
    const drop = await existing('drop');
    const initial = [keep, drop];

    await savePhotoChanges(db, 'task', taskId, initial, draftPhotosFrom([keep]));

    expect((await listAttachments(db, 'task', taskId)).map((a) => a.id)).toEqual([keep.id]);
    expect(deletePhotoFile).toHaveBeenCalledTimes(1);
    expect(deletePhotoFile).toHaveBeenCalledWith(drop.uri);
    expect(storePhoto).not.toHaveBeenCalled();
  });

  it('does nothing when the draft is unchanged', async () => {
    const keep = await existing('keep');
    await savePhotoChanges(db, 'task', taskId, [keep], draftPhotosFrom([keep]));

    expect(deletePhotoFile).not.toHaveBeenCalled();
    expect(storePhoto).not.toHaveBeenCalled();
  });
});

describe('purgeDeletedPhotos', () => {
  it('deletes the files of deleted pictures once', async () => {
    const drop = await existing('drop');
    await savePhotoChanges(db, 'task', taskId, [drop], []);
    jest.clearAllMocks();

    await purgeDeletedPhotos(db);
    expect(deletePhotoFile).toHaveBeenCalledWith(drop.uri);
    expect(await listDeletedAttachmentUris(db)).toEqual([]);

    jest.clearAllMocks();
    await purgeDeletedPhotos(db);
    expect(deletePhotoFile).not.toHaveBeenCalled();
  });
});
