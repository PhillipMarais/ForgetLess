import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { weekdayName } from '@/lib/recurrence';

type WeekdayPickerProps = {
  /** 0 = Monday … 6 = Sunday. */
  value: readonly number[];
  onChange: (value: number[]) => void;
};

/** Seven day buttons, Monday first; pick one or more. At least one stays chosen. */
export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const theme = useTheme();
  const toggle = (day: number) => {
    if (value.includes(day)) {
      if (value.length > 1) onChange(value.filter((item) => item !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  };

  return (
    <View style={styles.weekRow} accessibilityLabel="Repeat on these days">
      {Array.from({ length: 7 }, (_, day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={weekdayName(day, 'long')}
            onPress={() => toggle(day)}
            style={({ pressed }) => [
              styles.weekday,
              {
                backgroundColor: selected ? theme.accent : theme.backgroundElement,
                borderColor: selected ? theme.accent : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'text'}>
              {weekdayName(day).slice(0, 2)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

type MonthDayPickerProps = {
  /** 1–31. */
  value: number;
  onChange: (value: number) => void;
};

/** A calendar-like grid of the days 1–31. */
export function MonthDayPicker({ value, onChange }: MonthDayPickerProps) {
  const theme = useTheme();
  const rows = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => row * 7 + column + 1),
  );

  return (
    <View style={[styles.month, { backgroundColor: theme.backgroundElement }]} accessibilityRole="radiogroup" accessibilityLabel="Day of the month">
      {rows.map((days) => (
        <View key={days[0]} style={styles.monthRow}>
          {days.map((day) =>
            day > 31 ? (
              <View key={day} style={styles.monthCell} />
            ) : (
              <Pressable
                key={day}
                accessibilityRole="radio"
                accessibilityState={{ checked: day === value }}
                accessibilityLabel={`Day ${day}`}
                onPress={() => onChange(day)}
                style={({ pressed }) => [styles.monthCell, pressed && styles.pressed]}>
                <View style={[styles.monthDay, day === value && { backgroundColor: theme.accent }]}>
                  <ThemedText type={day === value ? 'smallBold' : 'small'} themeColor={day === value ? 'onAccent' : 'text'}>
                    {day}
                  </ThemedText>
                </View>
              </Pressable>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  weekday: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  month: {
    borderRadius: Radius.large,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  monthRow: {
    flexDirection: 'row',
  },
  monthCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  monthDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
