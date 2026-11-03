import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { WidgetRepresentation } from 'react-native-android-widget';

import { DATABASE_NAME } from '@/db/database-provider';
import { listOccurrences } from '@/db/events';
import { migrate } from '@/db/migrations';
import { listCategories } from '@/db/categories';
import { listMainNotes } from '@/db/notes';
import { loadSettings, type Settings } from '@/db/settings';
import { listTaskEntriesBetween, listTasks, listTodayTasks, type Task } from '@/db/tasks';
import { addDays, addMonths, monthGridDays, startOfDay, startOfMonth } from '@/lib/dates';
import { holidaysBetween } from '@/lib/holidays';

import { widgetPalettes, type WidgetColors } from './widget-theme';
import {
  CalendarWidget,
  NotesWidget,
  TasksWidget,
  TodayWidget,
  VoiceNoteWidget,
  type CalendarData,
  type CalendarItem,
  type NotesData,
  type TodayData,
} from './widgets';

/** Widget names; they match the widgets listed for the plugin in app.json. */
export const WIDGET_NAMES = ['Today', 'Calendar', 'Tasks', 'Notes', 'VoiceNote'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

let database: Promise<SQLiteDatabase> | null = null;

/**
 * The app's database. Widgets can update while the app is closed, so they open it themselves
 * (migrating it first if the app hasn't run since an update).
 */
export function widgetDatabase() {
  database ??= openDatabaseAsync(DATABASE_NAME).then(async (db) => {
    await migrate(db);
    return db;
  });
  return database;
}

type Size = { width: number; height: number; widgetId?: number };

/**
 * How many months each calendar widget has been paged from this one, by widget id. Kept in
 * memory only: once the phone frees the app's memory, widgets show this month again.
 */
const calendarOffsets = new Map<number, number>();

/** Pages a calendar widget to `offset` months from this one (0 = this month). */
export function setCalendarOffset(widgetId: number, offset: number) {
  if (offset === 0) calendarOffsets.delete(widgetId);
  else calendarOffsets.set(widgetId, offset);
}

/** Draws `name` for both light and dark mode, from the current data and theme. */
export async function renderWidgetByName(
  name: string,
  size: Size,
  db?: SQLiteDatabase,
  settings?: Settings,
): Promise<WidgetRepresentation> {
  const database = db ?? (await widgetDatabase());

  const resolved = settings ?? (await loadSettings(database));
  const offset = size.widgetId === undefined ? 0 : (calendarOffsets.get(size.widgetId) ?? 0);
  const data = await loadWidgetData(name as WidgetName, database, resolved, offset);
  const palettes = widgetPalettes(resolved);
  return { light: drawWidget(data, palettes.light, size), dark: drawWidget(data, palettes.dark, size) };
}

type WidgetData =
  | { name: 'Today'; data: TodayData }
  | { name: 'Tasks'; tasks: Task[] }
  | { name: 'Notes'; data: NotesData }
  | { name: 'Calendar'; data: CalendarData }
  | { name: 'VoiceNote' };

function drawWidget(widget: WidgetData, colors: WidgetColors, size: Size) {
  switch (widget.name) {
    case 'Today':
      return <TodayWidget colors={colors} data={widget.data} />;
    case 'Tasks':
      return <TasksWidget colors={colors} tasks={widget.tasks} />;
    case 'Notes':
      return <NotesWidget colors={colors} data={widget.data} />;
    case 'Calendar':
      return <CalendarWidget colors={colors} data={widget.data} width={size.width} height={size.height} />;
    default:
      return <VoiceNoteWidget colors={colors} width={size.width} />;
  }
}

/** Loads what the widget shows; drawn once each for light and dark mode. */
async function loadWidgetData(
  name: WidgetName,
  db: SQLiteDatabase,
  settings: Settings,
  monthOffset: number,
): Promise<WidgetData> {
  const today = startOfDay();
  const tomorrow = addDays(today, 1);

  if (name === 'Today') {
    const data = {
      day: today,
      events: await listOccurrences(db, today, tomorrow),
      tasks: await listTodayTasks(db, today, tomorrow),
    };
    return { name, data };
  }
  if (name === 'Tasks') return { name, tasks: await listTasks(db) };
  if (name === 'Notes') {
    // Like the Notes tab: pinned notes, the categories, then the notes in no category.
    const { pinned, voice, loose } = await listMainNotes(db);
    const notes = [...voice, ...loose].sort((a, b) => b.updatedAt - a.updatedAt);
    return { name, data: { pinned, categories: await listCategories(db), notes } };
  }
  if (name === 'Calendar') return { name, data: await loadCalendarData(db, settings, monthOffset) };
  return { name: 'VoiceNote' };
}

/** A month for the calendar widget: each day's holidays, events (all-day first) and tasks. */
export async function loadCalendarData(db: SQLiteDatabase, settings: Settings, offset: number): Promise<CalendarData> {
  const month = startOfMonth(addMonths(startOfMonth(startOfDay()), offset));
  const grid = monthGridDays(month);
  // Only the weeks that have days of this month (4 to 6), so each gets more room.
  const weeks: number[][] = [];
  for (let week = 0; week < 6; week++) {
    const days = grid.slice(week * 7, week * 7 + 7);
    if (days.some((day) => new Date(day).getMonth() === new Date(month).getMonth())) weeks.push(days);
  }
  const from = weeks[0][0];
  const to = addDays(weeks[weeks.length - 1][6], 1);

  const items = new Map<number, CalendarItem[]>();
  const add = (day: number, item: CalendarItem) => {
    const list = items.get(day);
    if (list) list.push(item);
    else items.set(day, [item]);
  };
  for (const [day, name] of holidaysBetween(settings.holidayRegion, from, to, settings.phoneHolidays)) {
    add(day, { title: name, kind: 'holiday' });
  }
  const occurrences = (await listOccurrences(db, from, to)).sort(
    (a, b) => Number(b.allDay) - Number(a.allDay) || a.startAt - b.startAt,
  );
  for (const occurrence of occurrences) {
    const last = Math.max(occurrence.startAt, occurrence.endAt - 1);
    for (let day = startOfDay(Math.max(occurrence.startAt, from)); day <= last && day < to; day = addDays(day, 1)) {
      add(day, { title: occurrence.title, kind: 'event' });
    }
  }
  const tasks = (await listTaskEntriesBetween(db, from, to)).sort((a, b) => a.dueAt! - b.dueAt!);
  for (const task of tasks) {
    add(startOfDay(task.dueAt!), { title: task.title, kind: 'task', done: task.completedAt !== null });
  }
  return { month, offset, weeks, items };
}
