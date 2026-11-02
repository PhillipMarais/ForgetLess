import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type Theme } from '@/constants/theme';
import { ThemeScope, useTheme } from '@/hooks/use-theme';

type ThemeSampleProps = {
  theme: Theme;
  /** Small swatch for a theme card instead of the full example screen. */
  compact?: boolean;
};

/** A miniature Forgetless screen drawn in `theme`, to show what a theme looks like. */
export function ThemeSample({ theme, compact }: ThemeSampleProps) {
  return (
    <ThemeScope theme={theme}>
      {compact ? <CompactSample /> : <FullSample />}
    </ThemeScope>
  );
}

function Frame({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[
        compact ? styles.compactFrame : styles.frame,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}>
      {colors.glow !== 'transparent' ? (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glow, 'transparent']}
          style={styles.glow}
        />
      ) : null}
      {children}
    </View>
  );
}

function CompactSample() {
  const colors = useTheme();
  return (
    <Frame compact>
      <ThemedText type="label" style={styles.compactLabel}>
        Today
      </ThemedText>
      <ThemedText type="heading">Aa</ThemedText>
      <View style={[styles.compactCard, { backgroundColor: colors.backgroundElement }]}>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <View style={[styles.line, { backgroundColor: colors.textSecondary }]} />
      </View>
    </Frame>
  );
}

function FullSample() {
  const colors = useTheme();
  return (
    <Frame>
      <ThemedText type="label">Monday, 2 November</ThemedText>
      <ThemedText type="subtitle">Good morning</ThemedText>

      <ThemedText type="label" style={styles.section}>
        Schedule
      </ThemedText>
      <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
        <View style={[styles.bar, { backgroundColor: colors.accent }]} />
        <View style={styles.flex}>
          <ThemedText type="defaultBold">Team standup</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            9:00 – 9:30 · Meeting room
          </ThemedText>
        </View>
      </View>

      <ThemedText type="label" themeColor="danger" style={styles.section}>
        Overdue
      </ThemedText>
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.checkbox, { borderColor: colors.textSecondary }]} />
        <View style={styles.flex}>
          <ThemedText>Pay the rent</ThemedText>
          <ThemedText type="small" themeColor="danger">
            Yesterday
          </ThemedText>
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.checkbox, { borderColor: colors.accent, backgroundColor: colors.accent }]}>
          <Icon name={Icons.check} size={14} color="onAccent" />
        </View>
        <ThemedText themeColor="textSecondary" style={[styles.flex, styles.done]}>
          Water the plants
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <View style={[styles.button, { backgroundColor: colors.accent }]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            Save
          </ThemedText>
        </View>
        <ThemedText type="smallBold" themeColor="accentText">
          View all
        </ThemedText>
        <View style={[styles.chip, { backgroundColor: colors.backgroundSelected }]}>
          <ThemedText type="small">Selected</ThemedText>
        </View>
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
    overflow: 'hidden',
  },
  compactFrame: {
    height: 104,
    padding: Spacing.two,
    gap: Spacing.half,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  compactLabel: {
    fontSize: 9,
    lineHeight: 12,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.small,
    padding: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  line: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  section: {
    marginTop: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  button: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
