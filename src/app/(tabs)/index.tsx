import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { AlarmRow } from '@/components/alarm-row';
import { ChipGroup } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { EventRow } from '@/components/event-row';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { AppBrand } from '@/components/logo';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listOccurrences } from '@/db/events';
import { dismissFromToday, listTodayTasks, taskEntryKey, type Task } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useLayout } from '@/hooks/use-layout';
import { planAlarms } from '@/lib/alarms';
import { addDays, formatLongDate, startOfDay } from '@/lib/dates';

type Filter = 'all' | 'schedule' | 'tasks';
type Tab = 'today' | 'alarms';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Schedule', value: 'schedule' },
  { label: 'Tasks', value: 'tasks' },
] as const satisfies readonly { label: string; value: Filter }[];

export default function TodayScreen() {
  const db = useSQLiteContext();
  const { wide } = useLayout();
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const [filter, setFilter] = useState<Filter>('all');
  const [tab, setTab] = useState<Tab>('today');
  const { data } = useLiveQuery(
    ['events', 'occurrence_exceptions', 'tasks', 'attachments', 'task_steps', 'reminders', 'alarm_skips'],
    `today:${today}`,
    async (db) => ({
      events: await listOccurrences(db, today, tomorrow),
      tasks: await listTodayTasks(db, today, tomorrow),
      // Today's alarms, including ones that have already rung.
      alarms: (await planAlarms(db, today)).filter((alarm) => alarm.at < tomorrow),
      // When this was loaded, to grey out alarms that have rung.
      loadedAt: Date.now(),
    }),
  );

  const events = data?.events ?? [];
  const alarms = data?.alarms ?? [];
  const overdue = data?.tasks.filter((task) => task.dueAt! < today) ?? [];
  const dueToday = data?.tasks.filter((task) => task.dueAt! >= today) ?? [];
  const anyDone = data?.tasks.some((task) => task.completedAt !== null) ?? false;
  const nothing = data && events.length === 0 && data.tasks.length === 0;
  const showSchedule = filter !== 'tasks';
  const showTasks = filter !== 'schedule';
  const showingAlarms = tab === 'alarms' && alarms.length > 0;

  const taskRows = (tasks: Task[]) =>
    tasks.map((task) => (
      <Animated.View key={taskEntryKey(task)} layout={LinearTransition.duration(200)}>
        <TaskRow task={task} onDismiss={() => dismissFromToday(db, task, today)} />
      </Animated.View>
    ));

  const schedule =
    showSchedule && events.length > 0 ? (
      <Section title="Schedule">
        {events.map((occurrence) => (
          <EventRow
            key={`${occurrence.eventId}:${occurrence.originalStart}`}
            occurrence={occurrence}
            day={today}
          />
        ))}
      </Section>
    ) : null;

  const tasks = showTasks ? (
    <>
      {overdue.length > 0 ? (
        <Section title="Overdue" danger>
          {taskRows(overdue)}
        </Section>
      ) : null}
      {dueToday.length > 0 ? <Section title="Tasks">{taskRows(dueToday)}</Section> : null}
      {anyDone ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Swipe a ticked-off task to the right to clear it.
        </ThemedText>
      ) : null}
    </>
  ) : null;

  const filteredEmpty =
    data && !nothing && ((filter === 'schedule' && events.length === 0) || (filter === 'tasks' && data.tasks.length === 0));

  return (
    <Screen
      title={formatLongDate(today)}
      heading={<TodayHeading day={today} />}
      top={<AppBrand />}
      fullWidth={wide}
      action={
        <IconButton icon={Icons.settings} label="Settings" onPress={() => router.push('/settings')} />
      }>
      <View style={styles.controls}>
        {alarms.length > 0 ? (
          <SegmentedControl
            label="Show"
            options={[
              { label: 'Today', value: 'today' },
              { label: `Alarms · ${alarms.length}`, value: 'alarms' },
            ]}
            value={tab}
            onChange={setTab}
          />
        ) : null}
        {!showingAlarms && !nothing ? (
          <ChipGroup label="Show" options={FILTERS} value={filter} onChange={setFilter} />
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {showingAlarms ? (
          <Section title="Alarms today">
            {alarms.map((alarm) => (
              <AlarmRow key={alarm.id} alarm={alarm} now={data?.loadedAt ?? 0} />
            ))}
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Tap an alarm to edit its {alarms.some((a) => a.ownerType === 'event') ? 'event or task' : 'task'} or
              cancel it.
            </ThemedText>
          </Section>
        ) : nothing ? (
          <EmptyState
            icon={Icons.today}
            title="Nothing on today"
            message="Today's events and the tasks due today show up here."
          />
        ) : filteredEmpty ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {filter === 'schedule' ? 'No events today.' : 'No tasks due today.'}
          </ThemedText>
        ) : wide && filter === 'all' ? (
          <View style={styles.columns}>
            <View style={styles.column}>{schedule}</View>
            <View style={styles.column}>{tasks}</View>
          </View>
        ) : (
          <>
            {schedule}
            {tasks}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** "Monday 2 November" on one line: the weekday in the accent colour, shrinking to fit. */
function TodayHeading({ day }: { day: number }) {
  const date = new Date(day);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long' });
  const rest = date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  return (
    <ThemedText
      type="title"
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      accessibilityRole="header"
      accessibilityLabel={formatLongDate(day)}>
      <ThemedText type="title" themeColor="accentText">
        {weekday}
      </ThemedText>{' '}
      {rest}
    </ThemedText>
  );
}

function Section({ title, danger, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <View>
      <ThemedText type="label" themeColor={danger ? 'danger' : undefined} style={styles.section}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  content: {
    paddingBottom: Spacing.four,
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  column: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  hint: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
