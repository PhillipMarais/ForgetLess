import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Days with events and days with tasks; each gets its own coloured dot. */
export type DayMarks = { events: ReadonlySet<number>; tasks: ReadonlySet<number> };

/** ", has events and tasks", for screen readers. */
export function describeMarks(marks: DayMarks, day: number) {
  const kinds = [marks.events.has(day) ? 'events' : null, marks.tasks.has(day) ? 'tasks' : null];
  const named = kinds.filter((kind) => kind !== null);
  return named.length > 0 ? `, has ${named.join(' and ')}` : '';
}

/** An accent dot for events and a text-coloured dot for tasks, side by side. */
export function DayDots({ marks, day, faded }: { marks: DayMarks; day: number; faded?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.dots, faded && styles.faded]}>
      {marks.events.has(day) ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
      {marks.tasks.has(day) ? <View style={[styles.dot, { backgroundColor: theme.text }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  faded: {
    opacity: 0.5,
  },
});
