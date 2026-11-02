import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { monthGridDays, startOfDay, weekdayLabels } from '@/lib/dates';

type MonthGridProps = {
  /** Any time within the month to show. */
  month: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  /** Day starts that have something on them; they get a dot. */
  busyDays: ReadonlySet<number>;
};

export function MonthGrid({ month, selectedDay, onSelectDay, busyDays }: MonthGridProps) {
  const theme = useTheme();
  const days = monthGridDays(month);
  const currentMonth = new Date(month).getMonth();
  const today = startOfDay();

  return (
    <View style={styles.grid}>
      <View style={styles.week}>
        {weekdayLabels().map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.weekday}>
            {label}
          </ThemedText>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} style={styles.week}>
          {days.slice(week * 7, week * 7 + 7).map((day) => {
            const date = new Date(day);
            const selected = day === selectedDay;
            const isToday = day === today;
            const inMonth = date.getMonth() === currentMonth;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${date.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}${busyDays.has(day) ? ', has items' : ''}`}
                onPress={() => onSelectDay(day)}
                style={styles.day}>
                <View
                  style={[
                    styles.dayCircle,
                    selected && { backgroundColor: theme.accent },
                    !selected && isToday && { borderColor: theme.accent, borderWidth: 1 },
                  ]}>
                  <ThemedText
                    type={isToday || selected ? 'smallBold' : 'small'}
                    themeColor={selected ? 'onAccent' : inMonth ? 'text' : 'textSecondary'}
                    style={!inMonth && !selected && styles.outside}>
                    {date.getDate()}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.dot,
                    busyDays.has(day) && { backgroundColor: inMonth ? theme.accent : theme.textSecondary },
                  ]}
                />
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
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outside: {
    opacity: 0.6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 1,
  },
});
