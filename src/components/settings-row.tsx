import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable page of settings groups. */
export function SettingsPage({ children }: PropsWithChildren) {
  return <ScrollView contentContainerStyle={styles.page}>{children}</ScrollView>;
}

/** A labelled card of related settings. */
export function SettingsGroup({ label, children }: PropsWithChildren<{ label: string }>) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <ThemedText type="label" style={styles.groupLabel}>
        {label}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

type SettingSwitchProps = {
  title: string;
  /** Explains what the current value does, so the user knows what they chose. */
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Greyed out and fixed, e.g. until the setting it depends on is turned on. */
  disabled?: boolean;
  /** Draws a line above, between rows of one group. */
  divided?: boolean;
};

export function SettingSwitch({ title, description, value, onChange, disabled, divided }: SettingSwitchProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        divided && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
        disabled && styles.disabled,
      ]}>
      <View style={styles.text}>
        <ThemedText type="defaultBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

type SettingChoicesProps<T extends string> = {
  /** Read by screen readers as the group's name. */
  label: string;
  options: readonly { value: T; title: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Drawn at the right of each option, e.g. an example at that size. */
  preview?: (value: T) => ReactNode;
};

/** One-of-several choice as a list of rows with a tick, and an optional example per row. */
export function SettingChoices<T extends string>({ label, options, value, onChange, preview }: SettingChoicesProps<T>) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.description ? `${option.title}. ${option.description}` : option.title}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth },
              selected && { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.radio, { borderColor: selected ? theme.accent : theme.textSecondary }]}>
              {selected ? <View style={[styles.radioDot, { backgroundColor: theme.accent }]} /> : null}
            </View>
            <View style={styles.text}>
              <ThemedText type="defaultBold">{option.title}</ThemedText>
              {option.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {option.description}
                </ThemedText>
              ) : null}
            </View>
            {preview ? <View style={styles.preview}>{preview(option.value)}</View> : null}
            {selected && !preview ? <Icon name={Icons.check} size={20} color="accentText" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  preview: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  groupLabel: {
    paddingHorizontal: Spacing.one,
  },
  card: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
