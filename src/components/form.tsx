import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { fontStyle, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useFontSize, useTheme } from '@/hooks/use-theme';

/** A labelled block in an editor form; `action` sits at the right of the label, e.g. Clear. */
export function FormSection({ label, action, children }: PropsWithChildren<{ label?: string; action?: ReactNode }>) {
  return (
    <View style={styles.section}>
      {label || action ? (
        <View style={styles.sectionHeader}>
          <ThemedText type="label" style={styles.sectionLabel}>
            {label}
          </ThemedText>
          {action}
        </View>
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

/**
 * A themed text field. Multi-line fields grow with their text instead of scrolling inside,
 * so the screen can keep the line being typed above the keyboard.
 */
export function FormTextInput({
  style,
  multiline,
  variant,
  ...props
}: TextInputProps & { /** 'title': larger, in the display font. */ variant?: 'title' }) {
  const theme = useAppTheme();
  const { colors } = theme;
  const fontSize = useFontSize(variant === 'title' ? 20 : 16);
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      multiline={multiline}
      scrollEnabled={multiline ? false : undefined}
      textAlignVertical={multiline ? 'top' : undefined}
      style={[
        styles.input,
        variant === 'title'
          ? [fontStyle(theme, 'display', 600), styles.title]
          : fontStyle(theme, 'body', 400),
        multiline && styles.multiline,
        { color: colors.text, backgroundColor: colors.backgroundElement, fontSize },
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionLabel: {
    flex: 1,
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
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: {
    fontSize: 20,
  },
  multiline: {
    minHeight: 96,
  },
});
