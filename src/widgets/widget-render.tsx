import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { WidgetRepresentation } from 'react-native-android-widget';

import { DATABASE_NAME } from '@/db/database-provider';
import { listOccurrences } from '@/db/events';
import { migrate } from '@/db/migrations';
import { listNotes, type Note } from '@/db/notes';
import { loadSettings, type Settings } from '@/db/settings';
import { listTaskEntriesBetween, listTasks, listTodayTasks, type Task } from '@/db/tasks';
import { addDays, monthGridDays, startOfDay, startOfMonth } from '@/lib/dates';
import { holidaysBetween } from '@/lib/holidays';

import { widgetPalettes, type WidgetColors } from './widget-theme';
import {
  CalendarWidget,
  NotesWidget,
  TasksWidget,
  TodayWidget,
  VoiceNoteWidget,
  type CalendarData,
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

type Size = { width: number; height: number };

/** Draws `name` for both light and dark mode, from the current data and theme. */
export async function renderWidgetByName(
  name: string,
  size: Size,
  db?: SQLiteDatabase,
  settings?: Settings,
): Promise<WidgetRepresentation> {
  const database = db ?? (await widgetDatabase());

  const resolved = settings ?? (await loadSettings(database));
  const data = await loadWidgetData(name as WidgetName, database, resolved);
  const palettes = widgetPalettes(resolved);
  return { light: drawWidget(data, palettes.light, size), dark: drawWidget(data, palettes.dark, size) };
}

type WidgetData =
  | { name: 'Today'; data: TodayData }
  | { name: 'Tasks'; tasks: Task[] }
  | { name: 'Notes'; notes: Note[] }
  | { name: 'Calendar'; data: CalendarData }
  | { name: 'VoiceNote' };

function drawWidget(widget: WidgetData, colors: WidgetColors, size: Size) {
  switch (widget.name) {
    case 'Today':
      return <TodayWidget colors={colors} data={widget.data} />;
    case 'Tasks':
      return <TasksWidget colors={colors} tasks={widget.tasks} />;
    case 'Notes':
      return <NotesWidget colors={colors} notes={widget.notes} />;
    case 'Calendar':
      return <CalendarWidget colors={colors} data={widget.data} width={size.width} height={size.height} />;
    default:
      return <VoiceNoteWidget colors={colors} width={size.width} />;
  }
}

/** Loads what the widget shows; drawn once each for light and dark mode. */
async function loadWidgetData(name: WidgetName, db: SQLiteDatabase, settings: Settings): Promise<WidgetData> {
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
  if (name === 'Notes') return { name, notes: await listNotes(db) };
  if (name === 'Calendar') {
    const days = monthGridDays(today);
    const from = days[0];
    const to = addDays(days[days.length - 1], 1);
    const eventDays = new Set<number>();
    for (const occurrence of await listOccurrences(db, from, to)) {
      const last = Math.max(occurrence.startAt, occurrence.endAt - 1);
      for (let day = startOfDay(Math.max(occurrence.startAt, from)); day <= last && day < to; day = addDays(day, 1)) {
        eventDays.add(day);
      }
    }
    const taskDays = new Set((await listTaskEntriesBetween(db, from, to)).map((task) => startOfDay(task.dueAt!)));
    const holidays = holidaysBetween(settings.holidayRegion, from, to);
    return { name, data: { month: startOfMonth(today), days, eventDays, taskDays, holidays } };
  }
  return { name: 'VoiceNote' };
}
