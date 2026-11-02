import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { startOfDay, weekDays } from '@/lib/dates';

type WeekStripProps = {
  /** Any time in the week to show. */
  week: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  busyDays: ReadonlySet<number>;
};

/** The 7 days of a week as buttons, with a dot on days that have something on them. */
export function WeekStrip({ week, selectedDay, onSelectDay, busyDays }: WeekStripProps) {
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
            })}${busyDays.has(day) ? ', has items' : ''}`}
            onPress={() => onSelectDay(day)}
            style={styles.day}>
            <ThemedText type="label" themeColor="textSecondary" style={styles.weekday}>
              {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </ThemedText>
            <View
              style={[
                styles.circle,
                selected && { backgroundColor: theme.accent },
                !selected && isToday && { borderColor: theme.accent, borderWidth: 1.5 },
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'text'}>
                {date.getDate()}
              </ThemedText>
            </View>
            <View style={[styles.dot, busyDays.has(day) && { backgroundColor: theme.accent }]} />
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
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
