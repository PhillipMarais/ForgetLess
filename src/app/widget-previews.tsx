import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { WidgetPreview } from 'react-native-android-widget';

import type { Category } from '@/db/categories';
import type { EventOccurrence } from '@/db/events';
import type { Note } from '@/db/notes';
import type { Task } from '@/db/tasks';
import { addDays, monthGridDays, startOfDay, startOfMonth } from '@/lib/dates';
import { drawWidget, type WidgetData, type WidgetName } from '@/widgets/widget-render';
import { widgetPalettes } from '@/widgets/widget-theme';
import type { CalendarItem } from '@/widgets/widgets';

/**
 * Not part of the app's navigation: draws one widget with made-up data, for the pictures the
 * home screen's widget list shows (assets/widgets). Opened by scripts/widget-previews.mjs as
 * forgetless:///widget-previews?name=Today.
 */

/** Each widget's size in the preview pictures, in dp. */
export const PREVIEW_SIZES: Record<WidgetName, { width: number; height: number }> = {
  Today: { width: 340, height: 300 },
  Calendar: { width: 340, height: 360 },
  Tasks: { width: 340, height: 200 },
  Notes: { width: 340, height: 260 },
  VoiceNote: { width: 170, height: 64 },
};

const HOUR = 3_600_000;

function task(title: string, dueAt: number | null, dueAllDay = false): Task {
  return {
    id: title,
    title,
    notes: null,
    dueAt,
    dueAllDay,
    timeZone: 'UTC',
    rrule: null,
    priority: 0,
    completedAt: null,
    sortOrder: 0,
    attachmentCount: 0,
    coverUri: null,
    createdAt: 0,
    updatedAt: 0,
    occurrence: null,
    steps: [],
  } as Task;
}

function event(title: string, startAt: number, hours: number): EventOccurrence {
  return {
    eventId: title,
    originalStart: startAt,
    title,
    notes: null,
    startAt,
    endAt: startAt + hours * HOUR,
    allDay: false,
    rrule: null,
    attachmentCount: 0,
    coverUri: null,
  };
}

function note(title: string, body: string, pinned = false): Note {
  return {
    id: title,
    title,
    body,
    pinned,
    categoryId: null,
    attachmentCount: 0,
    coverUri: null,
    documentCount: 0,
    voice: false,
    createdAt: 0,
    updatedAt: 0,
  } as Note;
}

function category(name: string, noteCount: number): Category {
  return { id: name, name, iconUri: null, sortOrder: 0, noteCount, createdAt: 0, updatedAt: 0 };
}

function sampleData(name: WidgetName): WidgetData {
  const today = startOfDay();
  if (name === 'Today') {
    return {
      name,
      data: {
        day: today,
        events: [event('Team stand-up', today + 9 * HOUR, 0.5), event('Dentist', today + 14 * HOUR, 1)],
        tasks: [task('Buy groceries', today, true), task('Call the plumber', today + 17 * HOUR)],
      },
    };
  }
  if (name === 'Tasks') {
    return {
      name,
      tasks: [
        task('Buy groceries', today, true),
        task('Call the plumber', today + 17 * HOUR),
        task('Pay the electricity bill', addDays(today, 2), true),
      ],
    };
  }
  if (name === 'Notes') {
    return {
      name,
      data: {
        pinned: [note('Shopping list', 'Milk, eggs, bread, coffee', true)],
        categories: [category('Work', 4), category('Recipes', 7)],
        notes: [note('Holiday ideas', 'Coast in December?')],
      },
    };
  }
  if (name === 'Calendar') {
    const month = startOfMonth(today);
    const grid = monthGridDays(month);
    const weeks: number[][] = [];
    for (let week = 0; week < 6; week++) {
      const days = grid.slice(week * 7, week * 7 + 7);
      if (days.some((day) => new Date(day).getMonth() === new Date(month).getMonth())) weeks.push(days);
    }
    const items = new Map<number, CalendarItem[]>();
    const on = (dayOfMonth: number, ...list: CalendarItem[]) => items.set(addDays(month, dayOfMonth - 1), list);
    on(3, { title: 'Stand-up', kind: 'event' }, { title: 'Groceries', kind: 'task' });
    on(7, { title: 'Braai', kind: 'event' });
    on(12, { title: 'Dentist', kind: 'event' }, { title: 'Plumber', kind: 'task', done: true });
    on(16, { title: 'Holiday', kind: 'holiday' });
    on(20, { title: 'Pay bills', kind: 'task' });
    on(24, { title: 'Birthday', kind: 'event' }, { title: 'Gift', kind: 'task' });
    return { name, data: { month, offset: 0, weeks, items } };
  }
  return { name: 'VoiceNote' };
}

export default function WidgetPreviewsScreen() {
  const { name = 'Today' } = useLocalSearchParams<{ name?: WidgetName }>();
  const size = PREVIEW_SIZES[name] ?? PREVIEW_SIZES.Today;
  // The app's own Dark look, as on most home screens.
  const colors = widgetPalettes({ theme: 'dark', customColors: undefined as never }).dark;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00FF00' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View accessible accessibilityLabel="widget-preview" style={{ width: size.width, height: size.height }}>
        <WidgetPreview
          width={size.width}
          height={size.height}
          renderWidget={() => drawWidget(sampleData(name), colors, size)}
        />
      </View>
    </View>
  );
}
