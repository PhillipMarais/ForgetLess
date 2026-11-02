import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet } from 'react-native';

import { formatFieldValue, type DateTimeFieldProps } from '@/components/date-time-field-shared';
import { TimePickerField } from '@/components/time-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Shows the value; tapping opens Android's system date or time dialog. */
export function DateTimeField(props: DateTimeFieldProps) {
  // Times use ForgetLess's own wheel picker on every platform.
  if (props.mode === 'time') return <TimePickerField {...props} />;
  return <DateField {...props} />;
}

function DateField({ mode, value, onChange, label }: DateTimeFieldProps) {
  const theme = useTheme();

  const open = () => {
    DateTimePickerAndroid.open({
      mode,
      value: new Date(value),
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(date.getTime());
      },
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatFieldValue(mode, value)}`}
      onPress={open}
      style={({ pressed }) => [
        styles.field,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText>{formatFieldValue(mode, value)}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
