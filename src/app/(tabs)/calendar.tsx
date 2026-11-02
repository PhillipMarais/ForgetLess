import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DayTimeline } from '@/components/day-timeline';
import { EventRow } from '@/components/event-row';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { MonthGrid } from '@/components/month-grid';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { SwipePager } from '@/components/swipe-pager';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { WeekStrip } from '@/components/week-strip';
import { Spacing } from '@/constants/theme';
import { listOccurrences, type EventOccurrence } from '@/db/events';
import type { CalendarView } from '@/db/settings';
import { listTasksDueBetween, type Task } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useLayout } from '@/hooks/use-layout';
import { useSettings } from '@/hooks/use-settings';
import {
  addDays,
  addMonths,
  formatLongDate,
  formatShortDay,
  formatWeekRange,
  monthGridDays,
  startOfDay,
  startOfWeek,
  weekDays,
} from '@/lib/dates';

const VIEWS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
] as const satisfies readonly { label: string; value: CalendarView }[];

/** Every day start an occurrence touches, clamped to [from, to). */
function daysTouched(occurrence: EventOccurrence, from: number, to: number) {
  const days: number[] = [];
  const last = Math.max(occurrence.startAt, occurrence.endAt - 1);
  for (
    let day = startOfDay(Math.max(occurrence.startAt, from));
    day <= last && day < to;
    day = addDays(day, 1)
  ) {
    days.push(day);
  }
  return days;
}

type DayItems = { events: EventOccurrence[]; tasks: Task[] };

export default function CalendarScreen() {
  const { settings, setSetting } = useSettings();
  const view = settings.calendarView;
  const { wide } = useLayout();
  const [selectedDay, setSelectedDay] = useState(() => startOfDay());

  // Month view loads the whole 6-week grid; day and week views load the week (for the strip).
  const grid = monthGridDays(selectedDay);
  const from = view === 'month' ? grid[0] : startOfWeek(selectedDay);
  const to = view === 'month' ? addDays(grid[grid.length - 1], 1) : addDays(from, 7);

  const { data } = useLiveQuery(
    ['events', 'occurrence_exceptions', 'tasks', 'attachments'],
    `${from}-${to}`,
    async (db) => ({
      occurrences: await listOccurrences(db, from, to),
      tasks: await listTasksDueBetween(db, from, to),
    }),
  );

  const busyDays = new Set<number>();
  for (const occurrence of data?.occurrences ?? []) {
    for (const day of daysTouched(occurrence, from, to)) busyDays.add(day);
  }
  for (const task of data?.tasks ?? []) busyDays.add(startOfDay(task.dueAt!));

  const itemsOn = (day: number): DayItems => {
    const end = addDays(day, 1);
    return {
      events: (data?.occurrences ?? []).filter((occurrence) =>
        daysTouched(occurrence, day, end).includes(day),
      ),
      tasks: (data?.tasks ?? []).filter((task) => task.dueAt! >= day && task.dueAt! < end),
    };
  };

  const step = (direction: -1 | 1) =>
    setSelectedDay((day) =>
      view === 'month'
        ? addMonths(day, direction)
        : addDays(day, view === 'week' ? 7 * direction : direction),
    );

  const addEvent = () =>
    router.push({ pathname: '/event/[id]', params: { id: 'new', date: String(selectedDay) } });

  const { title, subtitle } = headerFor(view, selectedDay);

  return (
    <Screen
      title={title}
      subtitle={subtitle}
      fullWidth={wide}
      action={
        <View style={styles.actions}>
          <IconButton
            icon={Icons.today}
            label="Go to today"
            onPress={() => setSelectedDay(startOfDay())}
          />
          <IconButton icon={Icons.previous} label={`Previous ${view}`} onPress={() => step(-1)} />
          <IconButton icon={Icons.next} label={`Next ${view}`} onPress={() => step(1)} />
          <IconButton icon={Icons.add} label="New event" variant="filled" onPress={addEvent} />
        </View>
      }>
      <View style={styles.viewSwitch}>
        <SegmentedControl
          label="Calendar view"
          options={VIEWS}
          value={view}
          onChange={(value) => setSetting('calendarView', value)}
        />
      </View>
      <SwipePager onSwipe={step}>
        {view === 'month' ? (
          <MonthView
            day={selectedDay}
            onSelectDay={setSelectedDay}
            busyDays={busyDays}
            items={itemsOn(selectedDay)}
            loaded={data !== undefined}
            wide={wide}
          />
        ) : null}
        {view === 'week' ? (
          <WeekView
            day={selectedDay}
            busyDays={busyDays}
            itemsOn={itemsOn}
            loaded={data !== undefined}
            onOpenDay={(day) => {
              setSelectedDay(day);
              setSetting('calendarView', 'day');
            }}
          />
        ) : null}
        {view === 'day' ? (
          <DayView
            day={selectedDay}
            onSelectDay={setSelectedDay}
            busyDays={busyDays}
            items={itemsOn(selectedDay)}
          />
        ) : null}
      </SwipePager>
    </Screen>
  );
}

function headerFor(view: CalendarView, day: number) {
  const year = String(new Date(day).getFullYear());
  if (view === 'month') {
    return { title: new Date(day).toLocaleDateString(undefined, { month: 'long' }), subtitle: year };
  }
  if (view === 'week') return { title: formatWeekRange(day), subtitle: year };
  return { title: formatShortDay(day), subtitle: year };
}

type MonthViewProps = {
  day: number;
  onSelectDay: (day: number) => void;
  busyDays: ReadonlySet<number>;
  items: DayItems;
  loaded: boolean;
  wide: boolean;
};

/** Month grid with the selected day's agenda below it, or beside it on wide screens. */
function MonthView({ day, onSelectDay, busyDays, items, loaded, wide }: MonthViewProps) {
  const grid = (
    <MonthGrid month={day} selectedDay={day} onSelectDay={onSelectDay} busyDays={busyDays} />
  );
  const agenda = <DayAgenda day={day} items={items} loaded={loaded} />;

  if (wide) {
    return (
      <View style={styles.split}>
        <ScrollView style={styles.splitPane} contentContainerStyle={styles.scroll}>
          {grid}
        </ScrollView>
        <ScrollView style={styles.splitPane} contentContainerStyle={styles.scroll}>
          {agenda}
        </ScrollView>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {grid}
      {agenda}
    </ScrollView>
  );
}

type WeekViewProps = {
  day: number;
  busyDays: ReadonlySet<number>;
  itemsOn: (day: number) => DayItems;
  loaded: boolean;
  /** Tapping a day in the strip opens it in day view. */
  onOpenDay: (day: number) => void;
};

/** The week's days as a strip, then each day's agenda in turn. */
function WeekView({ day, busyDays, itemsOn, loaded, onOpenDay }: WeekViewProps) {
  return (
    <View style={styles.fill}>
      <WeekStrip week={day} selectedDay={day} onSelectDay={onOpenDay} busyDays={busyDays} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {weekDays(day).map((weekDay) => (
          <DayAgenda key={weekDay} day={weekDay} items={itemsOn(weekDay)} loaded={loaded} compact />
        ))}
      </ScrollView>
    </View>
  );
}

type DayViewProps = {
  day: number;
  onSelectDay: (day: number) => void;
  busyDays: ReadonlySet<number>;
  items: DayItems;
};

/** Week strip, then all-day items and tasks, then the hour-by-hour timeline. */
function DayView({ day, onSelectDay, busyDays, items }: DayViewProps) {
  // On short screens (landscape phones) the timeline needs the room; arrows and swipes still
  // move between days.
  const { height } = useLayout();
  const showStrip = height >= 500;
  const end = addDays(day, 1);
  // All-day events, and timed events covering the whole day, sit above the timeline.
  const allDay = items.events.filter((o) => o.allDay || (o.startAt <= day && o.endAt >= end));
  const timed = items.events.filter((o) => !allDay.includes(o));

  return (
    <View style={styles.fill}>
      {showStrip ? (
        <WeekStrip week={day} selectedDay={day} onSelectDay={onSelectDay} busyDays={busyDays} />
      ) : null}
      {allDay.length > 0 || items.tasks.length > 0 ? (
        <View style={styles.dayTop}>
          {allDay.map((occurrence) => (
            <EventRow
              key={`${occurrence.eventId}:${occurrence.originalStart}`}
              occurrence={occurrence}
              day={day}
            />
          ))}
          {items.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </View>
      ) : null}
      <DayTimeline day={day} occurrences={timed} />
    </View>
  );
}

type DayAgendaProps = {
  day: number;
  items: DayItems;
  loaded: boolean;
  /** Week view: a shorter date label and a short "Nothing planned". */
  compact?: boolean;
};

/** One day's events and tasks under a date label. */
function DayAgenda({ day, items, loaded, compact }: DayAgendaProps) {
  const empty = items.events.length === 0 && items.tasks.length === 0;
  const isToday = day === startOfDay();
  return (
    <View>
      <ThemedText type="label" themeColor={isToday ? 'accent' : undefined} style={styles.dayTitle}>
        {compact ? formatShortDay(day) : formatLongDate(day)}
        {isToday ? ' · Today' : ''}
      </ThemedText>
      {loaded && empty ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {compact ? 'Nothing planned' : 'Nothing planned. Tap + to add an event.'}
        </ThemedText>
      ) : null}
      {items.events.map((occurrence) => (
        <EventRow
          key={`${occurrence.eventId}:${occurrence.originalStart}`}
          occurrence={occurrence}
          day={day}
        />
      ))}
      {items.tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  viewSwitch: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Spacing.four,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.four,
  },
  splitPane: {
    flex: 1,
  },
  dayTop: {
    paddingTop: Spacing.one,
  },
  dayTitle: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  empty: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
