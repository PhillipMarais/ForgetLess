import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EventRow } from '@/components/event-row';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { MonthGrid } from '@/components/month-grid';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listOccurrences, type EventOccurrence } from '@/db/events';
import { listTasksDueBetween } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import {
  addDays,
  addMonths,
  formatLongDate,
  monthGridDays,
  startOfDay,
  startOfMonth,
} from '@/lib/dates';

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

export default function CalendarScreen() {
  const [month, setMonth] = useState(() => startOfMonth(Date.now()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay());

  const grid = monthGridDays(month);
  const from = grid[0];
  const to = addDays(grid[grid.length - 1], 1);

  const { data } = useLiveQuery(
    ['events', 'occurrence_exceptions', 'tasks'],
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

  const dayEnd = addDays(selectedDay, 1);
  const dayEvents = (data?.occurrences ?? []).filter((occurrence) =>
    daysTouched(occurrence, selectedDay, dayEnd).includes(selectedDay),
  );
  const dayTasks = (data?.tasks ?? []).filter(
    (task) => task.dueAt! >= selectedDay && task.dueAt! < dayEnd,
  );

  const changeMonth = (months: number) => {
    const next = addMonths(month, months);
    setMonth(next);
    setSelectedDay(next);
  };

  const goToToday = () => {
    setMonth(startOfMonth(Date.now()));
    setSelectedDay(startOfDay());
  };

  const selectDay = (day: number) => {
    setSelectedDay(day);
    if (startOfMonth(day) !== month) setMonth(startOfMonth(day));
  };

  const addEvent = () =>
    router.push({ pathname: '/event/[id]', params: { id: 'new', date: String(selectedDay) } });

  return (
    <Screen
      title={new Date(month).toLocaleDateString(undefined, { month: 'long' })}
      subtitle={String(new Date(month).getFullYear())}
      action={
        <View style={styles.actions}>
          <IconButton icon={Icons.today} label="Go to today" onPress={goToToday} />
          <IconButton icon={Icons.previous} label="Previous month" onPress={() => changeMonth(-1)} />
          <IconButton icon={Icons.next} label="Next month" onPress={() => changeMonth(1)} />
          <IconButton icon={Icons.add} label="New event" variant="filled" onPress={addEvent} />
        </View>
      }>
      <ScrollView contentContainerStyle={styles.content}>
        <MonthGrid
          month={month}
          selectedDay={selectedDay}
          onSelectDay={selectDay}
          busyDays={busyDays}
        />
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.dayTitle}>
          {formatLongDate(selectedDay)}
        </ThemedText>
        {data && dayEvents.length === 0 && dayTasks.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            Nothing planned. Tap + to add an event.
          </ThemedText>
        ) : null}
        {dayEvents.map((occurrence) => (
          <EventRow
            key={`${occurrence.eventId}:${occurrence.originalStart}`}
            occurrence={occurrence}
            day={selectedDay}
          />
        ))}
        {dayTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  content: {
    paddingBottom: Spacing.four,
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
