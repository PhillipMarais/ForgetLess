import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

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
};

export function SettingSwitch({ title, description, value, onChange }: SettingSwitchProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <ThemedText type="defaultBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
