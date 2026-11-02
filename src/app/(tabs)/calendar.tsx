import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DayTimeline } from '@/components/day-timeline';
import { EventRow } from '@/components/event-row';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { MonthGrid } from '@/components/month-grid';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { SwipePager } from '@/components/swipe-pager';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { WeekStrip } from '@/components/week-strip';
import { Radius, Spacing } from '@/constants/theme';
import { listOccurrences, type EventOccurrence } from '@/db/events';
import type { CalendarView } from '@/db/settings';
import { listTaskEntriesBetween, taskEntryKey, type Task } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useLayout } from '@/hooks/use-layout';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  addMonths,
  formatLongDate,
  formatShortDay,
  formatWeekRange,
  monthGridDays,
  startOfDay,
  startOfMonth,
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

/** Start of the month, week or day containing `day`: what changes when the user pages. */
function periodStart(view: CalendarView, day: number) {
  if (view === 'month') return startOfMonth(day);
  if (view === 'week') return startOfWeek(day);
  return startOfDay(day);
}

export default function CalendarScreen() {
  const { settings, setSetting } = useSettings();
  const view = settings.calendarView;
  const { wide } = useLayout();
  const [selectedDay, setSelectedDay] = useState(() => startOfDay());
  // Which way the period last changed, so the new one slides in from that side.
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);

  const goTo = (day: number) => {
    setDirection(Math.sign(periodStart(view, day) - periodStart(view, selectedDay)) as -1 | 0 | 1);
    setSelectedDay(day);
  };

  // Month view loads the whole 6-week grid; day and week views load the week (for the strip).
  const grid = monthGridDays(selectedDay);
  const from = view === 'month' ? grid[0] : startOfWeek(selectedDay);
  const to = view === 'month' ? addDays(grid[grid.length - 1], 1) : addDays(from, 7);

  const { data } = useLiveQuery(
    ['events', 'occurrence_exceptions', 'tasks', 'attachments'],
    `${from}-${to}`,
    async (db) => ({
      occurrences: await listOccurrences(db, from, to),
      tasks: await listTaskEntriesBetween(db, from, to),
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

  const step = (by: -1 | 1) =>
    goTo(
      view === 'month'
        ? addMonths(selectedDay, by)
        : addDays(selectedDay, view === 'week' ? 7 * by : by),
    );

  const addEvent = () =>
    router.push({ pathname: '/event/[id]', params: { id: 'new', date: String(selectedDay) } });

  const { title, subtitle } = headerFor(view, selectedDay);

  return (
    <Screen
      title={title}
      subtitle={subtitle}
      fullWidth={wide}
      titleDirection={direction}
      action={
        <View style={styles.actions}>
          <IconButton icon={Icons.previous} label={`Previous ${view}`} onPress={() => step(-1)} />
          <IconButton icon={Icons.next} label={`Next ${view}`} onPress={() => step(1)} />
          <IconButton icon={Icons.add} label="New event" variant="filled" onPress={addEvent} />
        </View>
      }>
      <View style={styles.viewSwitch}>
        <View style={styles.flex}>
          <SegmentedControl
            label="Calendar view"
            options={VIEWS}
            value={view}
            onChange={(value) => {
              setDirection(0);
              setSetting('calendarView', value);
            }}
          />
        </View>
        <TodayButton
          away={periodStart(view, selectedDay) !== periodStart(view, startOfDay()) || selectedDay !== startOfDay()}
          onPress={() => goTo(startOfDay())}
        />
      </View>
      <SwipePager
        onSwipe={step}
        pageKey={`${view}:${periodStart(view, selectedDay)}`}
        direction={direction}>
        {view === 'month' ? (
          <MonthView
            day={selectedDay}
            onSelectDay={goTo}
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
              setDirection(0);
              setSelectedDay(day);
              setSetting('calendarView', 'day');
            }}
          />
        ) : null}
        {view === 'day' ? (
          <DayView
            day={selectedDay}
            onSelectDay={goTo}
            busyDays={busyDays}
            items={itemsOn(selectedDay)}
          />
        ) : null}
      </SwipePager>
    </Screen>
  );
}

/** Jumps back to today; filled when another day or period is showing. */
function TodayButton({ away, onPress }: { away: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go to today"
      onPress={onPress}
      style={({ pressed }) => [
        styles.todayButton,
        away
          ? { backgroundColor: theme.accent, borderColor: theme.accent }
          : { borderColor: theme.accentText },
        pressed && styles.pressed,
      ]}>
      <Icon name={Icons.today} size={18} color={away ? 'onAccent' : 'accentText'} />
      <ThemedText type="smallBold" themeColor={away ? 'onAccent' : 'accentText'}>
        Today
      </ThemedText>
    </Pressable>
  );
}

/** "EVENTS ———" or "TASKS ———": separates a day's events from its tasks. */
function Divider({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View>
      <View style={styles.divider}>
        <ThemedText type="label" themeColor="textSecondary" style={styles.dividerText}>
          {label}
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>
      {children}
    </View>
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
        <ScrollView style={styles.dayTop} contentContainerStyle={styles.dayTopContent}>
          {allDay.length > 0 ? (
            <Divider label="All-day events">
              {allDay.map((occurrence) => (
                <EventRow
                  key={`${occurrence.eventId}:${occurrence.originalStart}`}
                  occurrence={occurrence}
                  day={day}
                />
              ))}
            </Divider>
          ) : null}
          {items.tasks.length > 0 ? (
            <Divider label={`Tasks · ${items.tasks.length}`}>
              {items.tasks.map((task) => (
                <TaskRow key={taskEntryKey(task)} task={task} />
              ))}
            </Divider>
          ) : null}
        </ScrollView>
      ) : null}
      {allDay.length + items.tasks.length > 0 ? (
        <Divider label="Timeline">{null}</Divider>
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
      <ThemedText type="label" themeColor={isToday ? 'accentText' : undefined} style={styles.dayTitle}>
        {compact ? formatShortDay(day) : formatLongDate(day)}
        {isToday ? ' · Today' : ''}
      </ThemedText>
      {loaded && empty ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {compact ? 'Nothing planned' : 'Nothing planned. Tap + to add an event.'}
        </ThemedText>
      ) : null}
      {items.events.length > 0 ? (
        <Divider label={`Events · ${items.events.length}`}>
          {items.events.map((occurrence) => (
            <EventRow
              key={`${occurrence.eventId}:${occurrence.originalStart}`}
              occurrence={occurrence}
              day={day}
            />
          ))}
        </Divider>
      ) : null}
      {items.tasks.length > 0 ? (
        <Divider label={`Tasks · ${items.tasks.length}`}>
          {items.tasks.map((task) => (
            <TaskRow key={taskEntryKey(task)} task={task} />
          ))}
        </Divider>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  viewSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  dividerText: {
    fontSize: 11,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
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
    flexGrow: 0,
    maxHeight: '45%',
  },
  dayTopContent: {
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
