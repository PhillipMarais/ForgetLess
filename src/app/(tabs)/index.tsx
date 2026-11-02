import { ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { EventRow } from '@/components/event-row';
import { Icons } from '@/components/icon';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listOccurrences } from '@/db/events';
import { listOpenTasksDueBefore } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { addDays, formatLongDate, startOfDay } from '@/lib/dates';

export default function TodayScreen() {
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

  return (
    <Screen title="Today" subtitle={formatLongDate(today)}>
      <ScrollView contentContainerStyle={styles.content}>
        {data && events.length === 0 && data.tasks.length === 0 ? (
          <EmptyState
            icon={Icons.today}
            title="Nothing on today"
            message="Today's events and the tasks due today show up here."
          />
        ) : null}
        {events.length > 0 ? (
          <>
            <SectionTitle>Schedule</SectionTitle>
            {events.map((occurrence) => (
              <EventRow
                key={`${occurrence.eventId}:${occurrence.originalStart}`}
                occurrence={occurrence}
                day={today}
              />
            ))}
          </>
        ) : null}
        {overdue.length > 0 ? (
          <>
            <SectionTitle color="danger">Overdue</SectionTitle>
            {overdue.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </>
        ) : null}
        {dueToday.length > 0 ? (
          <>
            <SectionTitle>Due today</SectionTitle>
            {dueToday.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ children, color }: { children: string; color?: 'danger' }) {
  return (
    <ThemedText type="smallBold" themeColor={color ?? 'textSecondary'} style={styles.section}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.four,
  },
  section: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
});
