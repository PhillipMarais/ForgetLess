/**
 * Builds a database full of made-up events, tasks and notes for the Play store screenshots,
 * using the app's own repositories, and saves it to $STORE_DB (a file path). Run through Jest
 * so the app's TypeScript and path aliases work:
 *
 *   STORE_DB=/path/forgetless.db npx jest --testRegex 'store-data\.seed\.ts$' scripts/store-data.seed.ts
 *
 * Then copy the file to an emulator's files/SQLite/forgetless.db (see docs/play-store-release.md).
 * Dates are relative to today in $STORE_TZ (default Africa/Johannesburg), which must be the
 * emulator's time zone. Jest runs in London time, so times are worked out for that zone by hand.
 * Run it on the day of the screenshots.
 */
import { existsSync, rmSync } from 'node:fs';

import { createCategory } from '@/db/categories';
import { createEvent } from '@/db/events';
import { createNote } from '@/db/notes';
import { setAlarmOffset } from '@/db/reminders';
import { saveSetting } from '@/db/settings';
import { saveSteps } from '@/db/steps';
import { createTask, setTaskCompleted } from '@/db/tasks';
import { createMigratedTestDatabase } from '@/db/testing/test-database';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const ZONE = process.env.STORE_TZ ?? 'Africa/Johannesburg';

/** The wall-clock date and time of `time` in ZONE, as if it were UTC. */
function wallClock(time: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(time)
      .map((part) => [part.type, Number(part.value)]),
  );
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
}

/** Midnight in ZONE `days` from today, plus `hours` (may be fractional). */
function at(days: number, hours = 0) {
  const today = new Date(wallClock(Date.now()));
  const wall = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days) + hours * HOUR;
  // The zone's offset at that moment: a first guess, corrected once for any DST change.
  const guess = wall - (wallClock(wall) - wall);
  return wall - (wallClock(guess) - guess);
}

it('writes the store screenshot database', async () => {
  const out = process.env.STORE_DB;
  if (!out) throw new Error('Set STORE_DB to the file to write.');
  if (existsSync(out)) rmSync(out);
  const db = await createMigratedTestDatabase();

  // Events.
  const event = async (title: string, start: number, end: number, rrule: string | null = null, allDay = false) =>
    createEvent(db, { title, notes: null, startAt: start, endAt: end, allDay, rrule });
  await event('Team planning', at(0, 9), at(0, 9.5), 'FREQ=WEEKLY;BYDAY=MO');
  await event('Lunch with Sam', at(0, 13), at(0, 14));
  await event('Gym', at(0, 18.5), at(0, 19.5), 'FREQ=WEEKLY;BYDAY=MO,TH');
  const dentist = await event('Dentist', at(1, 10), at(1, 11));
  await setAlarmOffset(db, 'event', dentist, 60);
  await event('Book club', at(2, 19), at(2, 21));
  await event("Mia's birthday", at(4), at(5), 'FREQ=YEARLY', true);
  await event('Parkrun and coffee', at(5, 8), at(5, 10));
  await event('Movie night', at(-3, 19.5), at(-3, 22));
  await event('Car service', at(8, 8), at(8, 9));
  await event('Quarterly review', at(10, 14), at(10, 15));
  await event('Flight to Cape Town', at(17, 6.25), at(17, 8.5));
  await event('Cape Town trip', at(17), at(21), null, true);

  // Tasks.
  const task = (title: string, dueAt: number | null = null, dueAllDay = false, rrule: string | null = null) =>
    createTask(db, { title, dueAt, dueAllDay, rrule });
  await task('Pay the electricity bill', at(0), true);
  const dryCleaning = await task('Pick up dry cleaning', at(0, 17));
  await setAlarmOffset(db, 'task', dryCleaning, 0);
  await task('Book the car wash', at(0, 8));
  const landlord = await task('Reply to the landlord', at(0), true);
  await setTaskCompleted(db, landlord, true);
  await task('Call Mom', at(1, 19));
  const trip = await task('Plan the Cape Town trip', at(3), true);
  await saveSteps(db, trip, [
    { id: null, title: 'Book accommodation', doneAt: Date.now() - 2 * HOUR },
    { id: null, title: 'Rent a car', doneAt: Date.now() - 30 * MINUTE },
    { id: null, title: 'List places to see', doneAt: null },
    { id: null, title: 'Pack', doneAt: null },
  ]);
  await task('Water the plants', at(5), true, 'FREQ=WEEKLY;BYDAY=SA');
  await task("Renew driver's licence", at(10), true);
  await task('Buy new running shoes');

  // Notes.
  const recipes = await createCategory(db, { name: 'Recipes', iconUri: null });
  const travel = await createCategory(db, { name: 'Travel', iconUri: null });
  const ideas = await createCategory(db, { name: 'Ideas', iconUri: null });
  const work = await createCategory(db, { name: 'Work', iconUri: null });
  const note = (title: string, body: string, extra: { pinned?: boolean; categoryId?: string; voice?: boolean } = {}) =>
    createNote(db, { title, body, ...extra });
  await note('Lemon garlic chicken', 'Chicken thighs, 2 lemons, 6 garlic cloves, thyme.\n200°C for 40 minutes.', {
    categoryId: recipes,
  });
  await note('Banana bread', '3 ripe bananas, 2 cups flour, 1 cup sugar, 1 egg, butter.', { categoryId: recipes });
  await note('Packing list', 'Sunscreen\nHiking shoes\nCamera\nChargers\nRain jacket', { categoryId: travel });
  await note('Places to see', 'Table Mountain\nKirstenbosch\nCape Point\nBo-Kaap', { categoryId: travel });
  await note('Garden makeover', 'Raised beds by the fence. Herbs near the kitchen door.', { categoryId: ideas });
  await note('Meeting notes', 'Launch moved to March.\nSam to send the new budget by Friday.', { categoryId: work });
  await note('Books to read', 'The Midnight Library\nAtomic Habits\nProject Hail Mary');
  await note('Remember', 'Book the plumber for Thursday morning and ask about the geyser.', { voice: true });
  await note('Gift ideas for Mia', 'Pottery class\nNew headphones\nThat cookbook she liked', { categoryId: ideas });
  await note('Shopping list', 'Milk\nEggs\nSpinach\nCoffee beans\nBread', { pinned: true });

  // Created in Jest's London time; the app repeats items in the zone they were made in.
  await db.runAsync('UPDATE events SET time_zone = ?', ZONE);
  await db.runAsync('UPDATE tasks SET time_zone = ?', ZONE);

  // Settings: dark theme, and no calendar-access question on first open.
  await saveSetting(db, 'theme', 'dark');
  await saveSetting(db, 'calendarAccessAsked', true);
  await saveSetting(db, 'calendarView', 'month');

  await db.execAsync(`VACUUM INTO '${out.replaceAll("'", "''")}'`);
  await db.closeAsync();
});
