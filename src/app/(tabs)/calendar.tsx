import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { DayMarks } from '@/components/day-dots';
import { ChoiceDialog } from '@/components/choice-dialog';
import { DayTimeline } from '@/components/day-timeline';
import { EventRow } from '@/components/event-row';
import { HolidayBanner } from '@/components/holiday-banner';
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
import { listNotesTouchedBetween, type Note } from '@/db/notes';
import type { CalendarView } from '@/db/settings';
import { listTaskEntriesBetween, taskEntryKey, type Task } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useLayout } from '@/hooks/use-layout';
import { useSettings } from '@/hooks/use-settings';
import { useControlSize, useTheme } from '@/hooks/use-theme';
import {
  addDays,
  addMonths,
  formatLongDate,
  formatShortDay,
  formatTime,
  formatWeekRange,
  monthGridDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
  weekDays,
} from '@/lib/dates';
import { askCalendarAccess, hasCalendarAccess } from '@/lib/calendar-access';
import { holidaysBetween } from '@/lib/holidays';

const VIEWS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
] as const satisfies readonly { label: string; value: CalendarView }[];

/** Two taps on the same day within this long add an event on it. */
const DOUBLE_TAP_MS = 350;

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

function addEventOn(day: number) {
  router.push({ pathname: '/event/[id]', params: { id: 'new', date: String(day) } });
}

export default function CalendarScreen() {
  const { settings, setSetting } = useSettings();
  // Opens on the view chosen in Settings, or the one used last.
  const [view, setView] = useState<CalendarView>(() =>
    settings.calendarStartView === 'recent' ? settings.calendarView : settings.calendarStartView,
  );
  const { wide } = useLayout();
  const [selectedDay, setSelectedDay] = useState(() => startOfDay());
  // Which way the period last changed, so the new one slides in from that side.
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);
  const lastTap = useRef<{ day: number; at: number } | null>(null);

  // A day tapped in the calendar widget (forgetless:///calendar?day=…) is selected once.
  const { day: linkedDay } = useLocalSearchParams<{ day?: string }>();
  const [handledLink, setHandledLink] = useState<string | undefined>(undefined);
  if (linkedDay !== handledLink) {
    setHandledLink(linkedDay);
    const day = Number(linkedDay);
    if (linkedDay && Number.isFinite(day)) {
      setDirection(0);
      setSelectedDay(startOfDay(day));
    }
  }
  // Cleared again, so tapping the same day in the widget later selects it again.
  useEffect(() => {
    if (linkedDay) router.setParams({ day: undefined });
  }, [linkedDay]);

  // Once, explain and then ask to read the phone's holiday calendar (it has election days and
  // the like). Saying "Not now" also counts as asked; Settings can turn it on later.
  const [, setAccessChecked] = useState(false);
  const [explainAccess, setExplainAccess] = useState(false);
  useEffect(() => {
    if (!settings.phoneHolidays || settings.calendarAccessAsked || settings.holidayRegion === 'none') return;
    hasCalendarAccess().then((access) => {
      if (!access) setExplainAccess(true);
    });
  }, [settings.phoneHolidays, settings.calendarAccessAsked, settings.holidayRegion]);
  const answerAccess = async (allow: boolean) => {
    setExplainAccess(false);
    setSetting('calendarAccessAsked', true);
    // Granted: draw again so the new holidays show.
    if (allow && (await askCalendarAccess())) setAccessChecked(true);
  };

  const changeView = (next: CalendarView) => {
    setView(next);
    setSetting('calendarView', next);
  };

  const goTo = (day: number) => {
    setDirection(Math.sign(periodStart(view, day) - periodStart(view, selectedDay)) as -1 | 0 | 1);
    setSelectedDay(day);
  };

  /** A tap on a day in the grid or strip; a second tap on it straight after adds an event. */
  const tapDay = (day: number, select: (day: number) => void) => {
    const now = Date.now();
    if (lastTap.current?.day === day && now - lastTap.current.at < DOUBLE_TAP_MS) {
      lastTap.current = null;
      addEventOn(day);
      return;
    }
    lastTap.current = { day, at: now };
    select(day);
  };

  // Month view loads the whole 6-week grid; day and week views load the week (for the strip).
  const grid = monthGridDays(selectedDay);
  const from = view === 'month' ? grid[0] : startOfWeek(selectedDay);
  const to = view === 'month' ? addDays(grid[grid.length - 1], 1) : addDays(from, 7);

  const { data } = useLiveQuery(
    ['events', 'occurrence_exceptions', 'tasks', 'attachments', 'task_steps'],
    `${from}-${to}`,
    async (db) => ({
      occurrences: await listOccurrences(db, from, to),
      tasks: await listTaskEntriesBetween(db, from, to),
    }),
  );

  const eventDays = new Set<number>();
  const taskDays = new Set<number>();
  for (const occurrence of data?.occurrences ?? []) {
    for (const day of daysTouched(occurrence, from, to)) eventDays.add(day);
  }
  for (const task of data?.tasks ?? []) taskDays.add(startOfDay(task.dueAt!));
  const marks: DayMarks = {
    events: eventDays,
    tasks: taskDays,
    holidays: holidaysBetween(settings.holidayRegion, from, to, settings.phoneHolidays),
  };

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
          <IconButton icon={Icons.add} label="New event" variant="filled" onPress={() => addEventOn(selectedDay)} />
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
              changeView(value);
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
            onSelectDay={(day) => tapDay(day, goTo)}
            marks={marks}
            itemsOn={itemsOn}
            loaded={data !== undefined}
            wide={wide}
            holiday={marks.holidays.get(selectedDay)}
          />
        ) : null}
        {view === 'week' ? (
          <WeekView
            day={selectedDay}
            marks={marks}
            itemsOn={itemsOn}
            loaded={data !== undefined}
            onOpenDay={(day) =>
              tapDay(day, (tapped) => {
                setDirection(0);
                setSelectedDay(tapped);
                changeView('day');
              })
            }
          />
        ) : null}
        {view === 'day' ? (
          <DayView
            day={selectedDay}
            onSelectDay={(day) => tapDay(day, goTo)}
            marks={marks}
            items={itemsOn(selectedDay)}
          />
        ) : null}
      </SwipePager>
      <ChoiceDialog
        visible={explainAccess}
        title="Show election days and other holidays?"
        message="ForgetLess can read your phone's holiday calendar for days like elections. It only reads holiday calendars, never your own events, and nothing leaves your phone."
        choices={[{ label: 'Continue', value: true }]}
        onChoose={() => answerAccess(true)}
        onCancel={() => answerAccess(false)}
        cancelLabel="Not now"
      />
    </Screen>
  );
}

/** Jumps back to today; filled when another day or period is showing. */
function TodayButton({ away, onPress }: { away: boolean; onPress: () => void }) {
  const theme = useTheme();
  const minHeight = useControlSize(40);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go to today"
      onPress={onPress}
      style={({ pressed }) => [
        styles.todayButton,
        { minHeight },
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
function Divider({ label, children }: { label: string; children?: ReactNode }) {
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
  return { title: formatShortDay(day), subtitle: day === startOfDay() ? `${year} · Today` : year };
}

type MonthViewProps = {
  day: number;
  onSelectDay: (day: number) => void;
  marks: DayMarks;
  itemsOn: (day: number) => DayItems;
  loaded: boolean;
  wide: boolean;
  holiday?: string;
};

/** Month grid with the selected day's agenda below it, or beside it on wide screens. */
function MonthView({ day, onSelectDay, marks, itemsOn, loaded, wide, holiday }: MonthViewProps) {
  const grid = <MonthGrid month={day} selectedDay={day} onSelectDay={onSelectDay} marks={marks} itemsOn={itemsOn} />;
  const agenda = <DayAgenda day={day} items={itemsOn(day)} loaded={loaded} holiday={holiday} />;

  if (wide) {
    return (
      <View style={styles.split}>
        <ScrollView style={styles.splitPane} contentContainerStyle={styles.scroll}>
          {grid}
          <DoubleTapHint />
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
      <DoubleTapHint />
      {agenda}
    </ScrollView>
  );
}

function DoubleTapHint() {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
      Double-tap a day to add an event on it.
    </ThemedText>
  );
}

type WeekViewProps = {
  day: number;
  marks: DayMarks;
  itemsOn: (day: number) => DayItems;
  loaded: boolean;
  /** Tapping a day in the strip opens it in day view. */
  onOpenDay: (day: number) => void;
};

/** The week's days as a strip, then each day's agenda in turn; today's is highlighted. */
function WeekView({ day, marks, itemsOn, loaded, onOpenDay }: WeekViewProps) {
  return (
    <View style={styles.fill}>
      <WeekStrip week={day} selectedDay={day} onSelectDay={onOpenDay} marks={marks} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {weekDays(day).map((weekDay) => (
          <DayAgenda
            key={weekDay}
            day={weekDay}
            items={itemsOn(weekDay)}
            loaded={loaded}
            holiday={marks.holidays.get(weekDay)}
            compact
          />
        ))}
      </ScrollView>
    </View>
  );
}

type DayTab = 'timeline' | 'tasks' | 'notes';

type DayViewProps = {
  day: number;
  onSelectDay: (day: number) => void;
  marks: DayMarks;
  items: DayItems;
};

/**
 * Week strip, then tabs for the day: Timeline (all-day events, then hour by hour), Tasks,
 * and Notes written or edited that day.
 */
function DayView({ day, onSelectDay, marks, items }: DayViewProps) {
  // On short screens (landscape phones) the timeline needs the room; arrows and swipes still
  // move between days.
  const { height } = useLayout();
  const showStrip = height >= 500;
  const [tab, setTab] = useState<DayTab>('timeline');
  const end = addDays(day, 1);
  // All-day events, and timed events covering the whole day, sit above the timeline.
  const allDay = items.events.filter((o) => o.allDay || (o.startAt <= day && o.endAt >= end));
  const timed = items.events.filter((o) => !allDay.includes(o));
  const { data: notes } = useLiveQuery(['notes', 'attachments'], `day-notes:${day}`, (db) =>
    listNotesTouchedBetween(db, day, end),
  );

  const tabs = [
    { label: `Timeline${items.events.length ? ` · ${items.events.length}` : ''}`, value: 'timeline' },
    { label: `Tasks${items.tasks.length ? ` · ${items.tasks.length}` : ''}`, value: 'tasks' },
    { label: `Notes${notes?.length ? ` · ${notes.length}` : ''}`, value: 'notes' },
  ] as const satisfies readonly { label: string; value: DayTab }[];

  return (
    <View style={styles.fill}>
      {showStrip ? <WeekStrip week={day} selectedDay={day} onSelectDay={onSelectDay} marks={marks} /> : null}
      {marks.holidays.has(day) ? <HolidayBanner name={marks.holidays.get(day)!} /> : null}
      <View style={styles.dayTabs}>
        <SegmentedControl label="Show for this day" options={tabs} value={tab} onChange={setTab} />
      </View>

      {tab === 'timeline' ? (
        <>
          {allDay.length > 0 ? (
            <ScrollView style={styles.dayTop}>
              <Divider label="All-day events">
                {allDay.map((occurrence) => (
                  <EventRow
                    key={`${occurrence.eventId}:${occurrence.originalStart}`}
                    occurrence={occurrence}
                    day={day}
                    compact
                  />
                ))}
              </Divider>
            </ScrollView>
          ) : null}
          <DayTimeline day={day} occurrences={timed} />
        </>
      ) : null}

      {tab === 'tasks' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {items.tasks.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No tasks due on this day.
            </ThemedText>
          ) : (
            items.tasks.map((task) => <TaskRow key={taskEntryKey(task)} task={task} compact />)
          )}
        </ScrollView>
      ) : null}

      {tab === 'notes' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {notes?.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              No notes written or edited on this day.
            </ThemedText>
          ) : (
            notes?.map((note) => <DayNoteRow key={note.id} note={note} />)
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

/** A note in the day view: title, first line and when it was last edited. */
function DayNoteRow({ note }: { note: Note }) {
  const theme = useTheme();
  const title = note.title.trim() || 'Untitled';
  const preview = note.body.trim().split('\n')[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
      style={({ pressed }) => [styles.noteRow, { borderBottomColor: theme.border }, pressed && styles.pressed]}>
      <Icon name={Icons.notes} size={20} color="accentText" />
      <View style={styles.flex}>
        <ThemedText numberOfLines={1}>{title}</ThemedText>
        {preview ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {preview}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {formatTime(note.updatedAt)}
      </ThemedText>
    </Pressable>
  );
}

type DayAgendaProps = {
  day: number;
  items: DayItems;
  loaded: boolean;
  /** Week view: a shorter date label and a short "Nothing planned". */
  compact?: boolean;
  /** The public holiday on this day, if any. */
  holiday?: string;
};

/** One day's events and tasks under a date label; today's is shaded with an accent edge. */
function DayAgenda({ day, items, loaded, compact, holiday }: DayAgendaProps) {
  const theme = useTheme();
  const empty = items.events.length === 0 && items.tasks.length === 0;
  const isToday = day === startOfDay();
  return (
    <View
      style={
        isToday && compact
          ? [styles.today, { backgroundColor: theme.backgroundElement, borderLeftColor: theme.accent }]
          : undefined
      }>
      <View style={styles.dayTitleRow}>
        <ThemedText type="label" themeColor={isToday ? 'accentText' : undefined} style={styles.dayTitle}>
          {compact ? formatShortDay(day) : formatLongDate(day)}
        </ThemedText>
        {isToday ? (
          <View style={[styles.todayBadge, { backgroundColor: theme.accent }]}>
            <ThemedText type="label" themeColor="onAccent" style={styles.todayBadgeText}>
              Today
            </ThemedText>
          </View>
        ) : null}
      </View>
      {holiday ? <HolidayBanner name={holiday} /> : null}
      {loaded && empty ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          {compact ? 'Nothing planned' : 'Nothing planned. Tap + or double-tap the day to add an event.'}
        </ThemedText>
      ) : null}
      {items.events.length > 0 ? (
        <Divider label={`Events · ${items.events.length}`}>
          {items.events.map((occurrence) => (
            <EventRow
              key={`${occurrence.eventId}:${occurrence.originalStart}`}
              occurrence={occurrence}
              day={day}
              compact
            />
          ))}
        </Divider>
      ) : null}
      {items.tasks.length > 0 ? (
        <Divider label={`Tasks · ${items.tasks.length}`}>
          {items.tasks.map((task) => (
            <TaskRow key={taskEntryKey(task)} task={task} compact />
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
  dayTabs: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dayTop: {
    flexGrow: 0,
    maxHeight: '35%',
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  dayTitle: {
    flexShrink: 1,
  },
  today: {
    marginHorizontal: Spacing.two,
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  todayBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  todayBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  hint: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  empty: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
