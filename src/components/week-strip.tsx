import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { startOfDay, weekDays } from '@/lib/dates';

import { DayDots, describeMarks, type DayMarks } from './day-dots';

type WeekStripProps = {
  /** Any time in the week to show. */
  week: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  marks: DayMarks;
};

/**
 * The 7 days of a week as buttons, with dots on days that have events or tasks. Today's
 * column is shaded, so it stands out even when another day is selected.
 */
export function WeekStrip({ week, selectedDay, onSelectDay, marks }: WeekStripProps) {
  const theme = useTheme();
  const today = startOfDay();

  return (
    <View style={styles.row}>
      {weekDays(week).map((day) => {
        const date = new Date(day);
        const selected = day === selectedDay;
        const isToday = day === today;
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
            style={[styles.day, isToday && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="label" themeColor={isToday ? 'accentText' : 'textSecondary'} style={styles.weekday}>
              {isToday ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </ThemedText>
            <View
              style={[
                styles.circle,
                selected && { backgroundColor: theme.accent },
                !selected && isToday && { borderColor: theme.accent, borderWidth: 1.5 },
              ]}>
              <ThemedText
                type="smallBold"
                themeColor={selected ? 'onAccent' : marks.holidays.has(day) ? 'danger' : 'text'}>
                {date.getDate()}
              </ThemedText>
            </View>
            <DayDots marks={marks} day={day} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.medium,
  },
  weekday: {
    fontSize: 11,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
