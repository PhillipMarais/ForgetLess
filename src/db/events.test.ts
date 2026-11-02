import type { SQLiteDatabase } from 'expo-sqlite';

import {
  cancelOccurrence,
  createEvent,
  deleteEvent,
  editOccurrence,
  getOccurrence,
  listOccurrences,
  updateEvent,
  type EventInput,
} from './events';
import { createMigratedTestDatabase } from './testing/test-database';

const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();
const HOUR = 60 * 60 * 1000;

const NOV_1 = at(2026, 11, 1);
const DEC_1 = at(2026, 12, 1);

function input(overrides: Partial<EventInput> = {}): EventInput {
  return {
    title: 'Standup',
    notes: null,
    startAt: at(2026, 11, 2, 9),
    endAt: at(2026, 11, 2, 9, 30),
    allDay: false,
    rrule: null,
    ...overrides,
  };
}

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createMigratedTestDatabase();
});

describe('one-off events', () => {
  it('is listed only in ranges it overlaps', async () => {
    await createEvent(db, input({ title: 'Dentist' }));

    expect((await listOccurrences(db, NOV_1, DEC_1)).map((o) => o.title)).toEqual(['Dentist']);
    expect(await listOccurrences(db, at(2026, 11, 2, 9, 30), DEC_1)).toEqual([]);
    expect(await listOccurrences(db, at(2026, 11, 3), DEC_1)).toEqual([]);
  });

  it('includes multi-day events in every day they span', async () => {
    await createEvent(
      db,
      input({ title: 'Trip', allDay: true, startAt: at(2026, 11, 5), endAt: at(2026, 11, 8) }),
    );

    for (const day of [5, 6, 7]) {
      expect(await listOccurrences(db, at(2026, 11, day), at(2026, 11, day + 1))).toHaveLength(1);
    }
    expect(await listOccurrences(db, at(2026, 11, 8), at(2026, 11, 9))).toEqual([]);
  });

  it('can be updated and deleted', async () => {
    const id = await createEvent(db, input());
    await updateEvent(db, id, input({ title: 'Renamed' }));
    expect((await listOccurrences(db, NOV_1, DEC_1))[0].title).toBe('Renamed');

    await deleteEvent(db, id);
    expect(await listOccurrences(db, NOV_1, DEC_1)).toEqual([]);
  });
});

describe('repeating events', () => {
  it('expands every occurrence in range, keeping the duration', async () => {
    await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));

    const occurrences = await listOccurrences(db, NOV_1, DEC_1);
    expect(occurrences.map((o) => new Date(o.startAt).getDate())).toEqual([2, 9, 16, 23, 30]);
    expect(occurrences.every((o) => o.endAt - o.startAt === HOUR / 2)).toBe(true);
  });

  it('edits a single occurrence without touching the others', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    const original = at(2026, 11, 9, 9);
    await editOccurrence(db, id, original, {
      title: 'Moved standup',
      notes: 'In room 2',
      startAt: at(2026, 11, 10, 14),
      endAt: at(2026, 11, 10, 15),
    });

    const occurrences = await listOccurrences(db, NOV_1, DEC_1);
    expect(occurrences.map((o) => o.title)).toEqual([
      'Standup',
      'Moved standup',
      'Standup',
      'Standup',
      'Standup',
    ]);
    expect(occurrences[1]).toMatchObject({ originalStart: original, startAt: at(2026, 11, 10, 14) });
    expect(await getOccurrence(db, id, original)).toMatchObject({ notes: 'In room 2' });
  });

  it('editing the same occurrence twice updates it in place', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=DAILY' }));
    const original = at(2026, 11, 3, 9);
    const times = { notes: null, startAt: original, endAt: original + HOUR };
    await editOccurrence(db, id, original, { title: 'First', ...times });
    await editOccurrence(db, id, original, { title: 'Second', ...times });

    expect((await getOccurrence(db, id, original))?.title).toBe('Second');
  });

  it('cancels a single occurrence', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    await cancelOccurrence(db, id, at(2026, 11, 16, 9));

    const days = (await listOccurrences(db, NOV_1, DEC_1)).map((o) => new Date(o.startAt).getDate());
    expect(days).toEqual([2, 9, 23, 30]);
    expect(await getOccurrence(db, id, at(2026, 11, 16, 9))).toBeNull();
  });

  it('drops per-occurrence changes when the repeat rule changes', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    await cancelOccurrence(db, id, at(2026, 11, 16, 9));
    await updateEvent(db, id, input({ rrule: 'FREQ=DAILY' }));

    expect(await listOccurrences(db, NOV_1, DEC_1)).toHaveLength(29);
  });

  it('moves cancellations with the series when its time changes', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    await cancelOccurrence(db, id, at(2026, 11, 16, 9));
    await updateEvent(
      db,
      id,
      input({ rrule: 'FREQ=WEEKLY', startAt: at(2026, 11, 2, 10), endAt: at(2026, 11, 2, 11) }),
    );

    const occurrences = await listOccurrences(db, NOV_1, DEC_1);
    expect(occurrences.map((o) => new Date(o.startAt).getDate())).toEqual([2, 9, 23, 30]);
    expect(occurrences.every((o) => new Date(o.startAt).getHours() === 10)).toBe(true);
  });

  it('moves several one-off changes by a week without them colliding', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    await cancelOccurrence(db, id, at(2026, 11, 9, 9));
    await cancelOccurrence(db, id, at(2026, 11, 16, 9));
    await updateEvent(
      db,
      id,
      input({ rrule: 'FREQ=WEEKLY', startAt: at(2026, 11, 9, 9), endAt: at(2026, 11, 9, 9, 30) }),
    );

    const days = (await listOccurrences(db, NOV_1, DEC_1)).map((o) => new Date(o.startAt).getDate());
    expect(days).toEqual([9, 30]);
  });

  it('a title changed for all events replaces earlier one-off titles', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    const original = at(2026, 11, 9, 9);
    await editOccurrence(db, id, original, {
      title: 'Gym (short)',
      notes: 'Only legs',
      startAt: original,
      endAt: original + HOUR / 2,
    });
    await updateEvent(db, id, input({ rrule: 'FREQ=WEEKLY', title: 'Gym (long)' }));

    const occurrences = await listOccurrences(db, NOV_1, DEC_1);
    expect(occurrences.every((o) => o.title === 'Gym (long)')).toBe(true);
    // Notes were not changed for all events, so the one-off notes stay.
    expect((await getOccurrence(db, id, original))?.notes).toBe('Only legs');
  });

  it('times changed for all events replace earlier one-off times', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    const original = at(2026, 11, 9, 9);
    await editOccurrence(db, id, original, {
      title: 'Standup',
      notes: null,
      startAt: at(2026, 11, 9, 14),
      endAt: at(2026, 11, 9, 15),
    });
    await updateEvent(
      db,
      id,
      input({ rrule: 'FREQ=WEEKLY', startAt: at(2026, 11, 2, 8), endAt: at(2026, 11, 2, 8, 30) }),
    );

    expect(await getOccurrence(db, id, at(2026, 11, 9, 8))).toMatchObject({
      startAt: at(2026, 11, 9, 8),
      endAt: at(2026, 11, 9, 8, 30),
    });
  });

  it('keeps per-occurrence changes when only the title changes', async () => {
    const id = await createEvent(db, input({ rrule: 'FREQ=WEEKLY' }));
    await cancelOccurrence(db, id, at(2026, 11, 16, 9));
    await updateEvent(db, id, input({ rrule: 'FREQ=WEEKLY', title: 'Daily sync' }));

    const occurrences = await listOccurrences(db, NOV_1, DEC_1);
    expect(occurrences).toHaveLength(4);
    expect(occurrences[0].title).toBe('Daily sync');
  });

  it('lists an occurrence that started before the range but is still running', async () => {
    await createEvent(
      db,
      input({ rrule: 'FREQ=DAILY', startAt: at(2026, 11, 1, 23), endAt: at(2026, 11, 2, 1) }),
    );

    const occurrences = await listOccurrences(db, at(2026, 11, 2), at(2026, 11, 2, 12));
    expect(occurrences.map((o) => o.startAt)).toEqual([at(2026, 11, 1, 23)]);
  });

  it('sorts all-day events before timed ones that start at the same time', async () => {
    await createEvent(db, input({ title: 'Timed', startAt: at(2026, 11, 2), endAt: at(2026, 11, 2, 1) }));
    await createEvent(
      db,
      input({ title: 'All day', allDay: true, startAt: at(2026, 11, 2), endAt: at(2026, 11, 3) }),
    );

    expect((await listOccurrences(db, NOV_1, DEC_1)).map((o) => o.title)).toEqual([
      'All day',
      'Timed',
    ]);
  });
});
