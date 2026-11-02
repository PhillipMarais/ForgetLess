import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { EventRow } from '@/components/event-row';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listOccurrences } from '@/db/events';
import { listOpenTasksDueBefore } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useLayout } from '@/hooks/use-layout';
import { addDays, formatLongDate, startOfDay } from '@/lib/dates';

export default function TodayScreen() {
  const { wide } = useLayout();
  const today = startOfDay();
  const tomorrow = addDays(today, 1);
  const { data } = useLiveQuery(
    ['events', 'occurrence_exceptions', 'tasks', 'attachments'],
    `today:${today}`,
    async (db) => ({
      events: await listOccurrences(db, today, tomorrow),
      tasks: await listOpenTasksDueBefore(db, tomorrow),
    }),
  );

  const events = data?.events ?? [];
  const overdue = data?.tasks.filter((task) => task.dueAt! < today) ?? [];
  const dueToday = data?.tasks.filter((task) => task.dueAt! >= today) ?? [];
  const nothing = data && events.length === 0 && data.tasks.length === 0;

  const schedule =
    events.length > 0 ? (
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

  const tasks = (
    <>
      {overdue.length > 0 ? (
        <Section title="Overdue" danger>
          {overdue.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </Section>
      ) : null}
      {dueToday.length > 0 ? (
        <Section title="Due today">
          {dueToday.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </Section>
      ) : null}
    </>
  );

  return (
    <Screen
      title="Today"
      subtitle={formatLongDate(today)}
      fullWidth={wide}
      action={
        <IconButton icon={Icons.settings} label="Settings" onPress={() => router.push('/settings')} />
      }>
      <ScrollView contentContainerStyle={styles.content}>
        {nothing ? (
          <EmptyState
            icon={Icons.today}
            title="Nothing on today"
            message="Today's events and the tasks due today show up here."
          />
        ) : wide ? (
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
});
