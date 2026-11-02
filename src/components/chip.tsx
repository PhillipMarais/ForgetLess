import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipGroupProps<T> = {
  /** Read by screen readers as the group's name. */
  label: string;
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of single-choice chips. */
export function ChipGroup<T>({ label, options, value, onChange }: ChipGroupProps<T>) {
  const theme = useTheme();

  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              { borderColor: selected ? theme.accent : theme.border },
              selected && { backgroundColor: theme.accent },
            ]}>
            <ThemedText type="small" themeColor={selected ? 'onAccent' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
