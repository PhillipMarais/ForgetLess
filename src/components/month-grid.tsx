import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { EventOccurrence } from '@/db/events';
import type { Task } from '@/db/tasks';
import { useTheme } from '@/hooks/use-theme';
import { monthGridDays, startOfDay, weekdayLabels } from '@/lib/dates';

import { describeMarks, type DayMarks } from './day-dots';

type MonthGridProps = {
  /** Any time within the month to show. */
  month: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  marks: DayMarks;
  /** A day's events and tasks, listed in its cell. */
  itemsOn: (day: number) => { events: EventOccurrence[]; tasks: Task[] };
};

/** Lines of items a day shows; with more, the date gets a "+N". */
const MAX_LINES = 3;
const LINE_HEIGHT = 15;

type DayLine = { title: string; kind: 'holiday' | 'event' | 'task'; done?: boolean };

/** What a day lists, in order: its holiday, events (all-day first), then tasks. */
function linesFor(day: number, marks: DayMarks, itemsOn: MonthGridProps['itemsOn']): DayLine[] {
  const { events, tasks } = itemsOn(day);
  const holiday = marks.holidays.get(day);
  return [
    ...(holiday ? [{ title: holiday, kind: 'holiday' as const }] : []),
    ...[...events]
      .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startAt - b.startAt)
      .map((event) => ({ title: event.title, kind: 'event' as const })),
    ...[...tasks]
      .sort((a, b) => a.dueAt! - b.dueAt!)
      .map((task) => ({ title: task.title, kind: 'task' as const, done: task.completedAt !== null })),
  ];
}

/**
 * Like a wall calendar (and the calendar widget): each day lists what's on it, as much as
 * fits. Only the weeks with days of this month are shown.
 */
export function MonthGrid({ month, selectedDay, onSelectDay, marks, itemsOn }: MonthGridProps) {
  const theme = useTheme();
  const days = monthGridDays(month);
  const currentMonth = new Date(month).getMonth();
  const today = startOfDay();
  const weeks = Array.from({ length: 6 }, (_, week) => days.slice(week * 7, week * 7 + 7)).filter((week) =>
    week.some((day) => new Date(day).getMonth() === currentMonth),
  );

  return (
    <View style={styles.grid}>
      <View style={styles.weekdays}>
        {weekdayLabels().map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.weekday}>
            {label}
          </ThemedText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={[styles.week, { borderTopColor: theme.border }]}>
          {week.map((day) => {
            const date = new Date(day);
            const selected = day === selectedDay;
            const isToday = day === today;
            const inMonth = date.getMonth() === currentMonth;
            const lines = linesFor(day, marks, itemsOn);
            const shown = lines.slice(0, MAX_LINES);
            const hidden = lines.length - shown.length;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}${isToday ? ', today' : ''}${describeMarks(marks, day)}`}
                onPress={() => onSelectDay(day)}
                style={[
                  styles.day,
                  selected && { backgroundColor: theme.backgroundSelected, borderColor: theme.accent },
                  !inMonth && styles.outside,
                ]}>
                <View style={styles.dayTop}>
                  <View style={[styles.dayNumber, isToday && { backgroundColor: theme.accent }]}>
                    <ThemedText
                      type={isToday || selected ? 'smallBold' : 'small'}
                      themeColor={
                        isToday ? 'onAccent' : marks.holidays.has(day) ? 'danger' : inMonth ? 'text' : 'textSecondary'
                      }
                      style={styles.dayNumberText}>
                      {date.getDate()}
                    </ThemedText>
                  </View>
                  {hidden > 0 ? (
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.more}>
                      +{hidden}
                    </ThemedText>
                  ) : null}
                </View>
                {shown.map((line, index) => {
                  const tint = line.kind === 'holiday' ? theme.danger : line.kind === 'event' ? theme.accent : null;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.line,
                        // The colour at 20% strength behind the text.
                        tint ? { backgroundColor: `${tint.slice(0, 7)}33` } : null,
                      ]}>
                      <ThemedText
                        numberOfLines={1}
                        type="small"
                        themeColor={line.done ? 'textSecondary' : line.kind === 'holiday' ? 'danger' : 'text'}
                        style={styles.lineText}>
                        {line.kind === 'task' ? `${line.done ? '✓' : '•'} ${line.title}` : line.title}
                      </ThemedText>
                    </View>
                  );
                })}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: Spacing.two,
  },
  weekdays: {
    flexDirection: 'row',
    paddingBottom: Spacing.one,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  week: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  day: {
    flex: 1,
    // Room for the date and MAX_LINES lines.
    height: 24 + MAX_LINES * (LINE_HEIGHT + 1) + 4,
    paddingTop: 2,
    paddingHorizontal: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  dayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
    gap: 2,
  },
  dayNumber: {
    minWidth: 22,
    height: 20,
    borderRadius: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 13,
    lineHeight: 18,
  },
  more: {
    fontSize: 10,
    lineHeight: 14,
  },
  line: {
    height: LINE_HEIGHT,
    marginTop: 1,
    paddingHorizontal: 2,
    borderRadius: 3,
    justifyContent: 'center',
  },
  lineText: {
    fontSize: 10,
    lineHeight: 13,
  },
  outside: {
    opacity: 0.5,
  },
});
