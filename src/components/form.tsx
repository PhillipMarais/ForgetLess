import type { PropsWithChildren } from 'react';
import { StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A labelled block in an editor form. */
export function FormSection({ label, children }: PropsWithChildren<{ label?: string }>) {
  return (
    <View style={styles.section}>
      {label ? (
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

/** Label on the left, control on the right. */
export function FormRow({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <View style={styles.rowControls}>{children}</View>
    </View>
  );
}

export function FormSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <FormRow label={label}>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        thumbColor="#ffffff"
      />
    </FormRow>
  );
}

export function FormTextInput({ style, multiline, ...props }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : undefined}
      style={[
        styles.input,
        multiline && styles.multiline,
        { color: theme.text, backgroundColor: theme.backgroundElement },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
  },
  rowLabel: {
    flexShrink: 1,
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  multiline: {
    minHeight: 96,
  },
});
