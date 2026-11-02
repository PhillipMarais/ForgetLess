import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { Icon, Icons, type IconName } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type Theme } from '@/constants/theme';
import { ThemeScope, useTheme } from '@/hooks/use-theme';

export const SAMPLE_PAGES = [
  { key: 'today', label: 'Today' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'task', label: 'Edit task' },
] as const;

type SamplePage = (typeof SAMPLE_PAGES)[number]['key'];

type ThemeSampleProps = {
  theme: Theme;
  /** Small swatch for a theme card instead of an example screen. */
  compact?: boolean;
  page?: SamplePage;
};

/** A miniature ForgetLess screen drawn in `theme`, to show what a theme looks like. */
export function ThemeSample({ theme, compact, page = 'today' }: ThemeSampleProps) {
  return (
    <ThemeScope theme={theme}>
      {compact ? (
        <CompactSample />
      ) : page === 'calendar' ? (
        <CalendarSample />
      ) : page === 'task' ? (
        <TaskSample />
      ) : (
        <TodaySample />
      )}
    </ThemeScope>
  );
}

/**
 * The three example screens side by side: swipe between them or use the arrows.
 * They scroll with the page; only sideways swipes change the example.
 */
export function ThemeSamplePager({ theme }: { theme: Theme }) {
  const colors = useTheme();
  const ref = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(SAMPLE_PAGES.length - 1, next));
    ref.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.pager}>
      <View style={styles.pagerHeader}>
        <PagerArrow icon={Icons.previous} label="Previous example" disabled={index === 0} onPress={() => goTo(index - 1)} />
        <View style={styles.pagerTitle} accessibilityLiveRegion="polite">
          <ThemedText type="label">
            Example {index + 1} of {SAMPLE_PAGES.length}
          </ThemedText>
          <ThemedText type="defaultBold">{SAMPLE_PAGES[index].label}</ThemedText>
        </View>
        <PagerArrow
          icon={Icons.next}
          label="Next example"
          disabled={index === SAMPLE_PAGES.length - 1}
          onPress={() => goTo(index + 1)}
        />
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          scrollEventThrottle={16}>
          {width > 0
            ? SAMPLE_PAGES.map((page) => (
                <View key={page.key} style={{ width }}>
                  <ThemeSample theme={theme} page={page.key} />
                </View>
              ))
            : null}
        </ScrollView>
      </View>
      <View style={styles.dots}>
        {SAMPLE_PAGES.map((page, dot) => (
          <Pressable
            key={page.key}
            accessibilityRole="button"
            accessibilityLabel={`Show the ${page.label} example`}
            onPress={() => goTo(dot)}
            hitSlop={Spacing.two}
            style={[
              styles.dot,
              { backgroundColor: dot === index ? colors.accent : colors.border },
              dot === index && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function PagerArrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        (pressed || disabled) && styles.dimmed,
      ]}>
      <Icon name={icon} size={24} color="text" />
    </Pressable>
  );
}

function Frame({ children, compact }: { children: ReactNode; compact?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[
        compact ? styles.compactFrame : styles.frame,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}>
      {colors.glow !== 'transparent' ? (
        <LinearGradient pointerEvents="none" colors={[colors.glow, 'transparent']} style={styles.glow} />
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
        <View style={[styles.dotSmall, { backgroundColor: colors.accent }]} />
        <View style={[styles.line, { backgroundColor: colors.textSecondary }]} />
      </View>
    </Frame>
  );
}

function Checkbox({ done }: { done?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.checkbox,
        { borderColor: done ? colors.accent : colors.textSecondary },
        done && { backgroundColor: colors.accent },
      ]}>
      {done ? <Icon name={Icons.check} size={14} color="onAccent" /> : null}
    </View>
  );
}

function Divider({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View style={styles.divider}>
      <ThemedText type="label" themeColor="textSecondary" style={styles.dividerText}>
        {label}
      </ThemedText>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

function TodaySample() {
  const colors = useTheme();
  return (
    <Frame>
      <View style={styles.brandRow}>
        <LogoMark height={14} />
        <ThemedText type="smallBold" style={styles.flex}>
          FORGET<ThemedText type="smallBold" themeColor="accent">LESS</ThemedText>
        </ThemedText>
        <Icon name={Icons.settings} size={18} color="text" />
      </View>
      <ThemedText type="subtitle">Monday, 2 November</ThemedText>

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
        <Checkbox />
        <View style={styles.flex}>
          <ThemedText>Pay the rent</ThemedText>
          <ThemedText type="small" themeColor="danger">
            Yesterday
          </ThemedText>
        </View>
      </View>
      <View style={styles.row}>
        <Checkbox done />
        <View style={styles.flex}>
          <ThemedText themeColor="textSecondary" style={styles.done}>
            Water the plants
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.done}>
            The ferns on the balcony
          </ThemedText>
        </View>
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

function CalendarSample() {
  const colors = useTheme();
  const days = Array.from({ length: 21 }, (_, index) => index + 2);
  return (
    <Frame>
      <ThemedText type="label">2026</ThemedText>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle" style={styles.flex}>
          November
        </ThemedText>
        <View style={[styles.addButton, { backgroundColor: colors.accent }]}>
          <Icon name={Icons.add} size={18} color="onAccent" />
        </View>
      </View>
      <View style={styles.segmentRow}>
        <View style={[styles.segments, { backgroundColor: colors.backgroundElement }]}>
          {['Day', 'Week', 'Month'].map((label) => (
            <View
              key={label}
              style={[styles.segment, label === 'Month' && { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText type="small" themeColor={label === 'Month' ? 'text' : 'textSecondary'}>
                {label}
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={[styles.todayPill, { borderColor: colors.accentText }]}>
          <ThemedText type="smallBold" themeColor="accentText">
            Today
          </ThemedText>
        </View>
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const selected = day === 4;
          const busy = day === 4 || day === 9 || day === 13 || day === 18;
          return (
            <View key={day} style={styles.gridCell}>
              <View style={[styles.gridDay, selected && { backgroundColor: colors.accent }]}>
                <ThemedText type="small" themeColor={selected ? 'onAccent' : 'text'}>
                  {day}
                </ThemedText>
              </View>
              <View style={[styles.busy, { backgroundColor: busy && !selected ? colors.accent : 'transparent' }]} />
            </View>
          );
        })}
      </View>
      <Divider label="Events · 1" />
      <View style={styles.row}>
        <View style={[styles.bar, styles.barTall, { backgroundColor: colors.accent }]} />
        <View style={styles.flex}>
          <ThemedText>Dentist</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            14:00 – 15:00
          </ThemedText>
        </View>
      </View>
      <Divider label="Tasks · 1" />
      <View style={styles.row}>
        <Checkbox />
        <View style={styles.flex}>
          <ThemedText>Gym</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Wed 18:00
          </ThemedText>
        </View>
        <Icon name={Icons.repeat} size={14} color="textSecondary" />
      </View>
    </Frame>
  );
}

function FakeSwitch({ on }: { on: boolean }) {
  const colors = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: on ? colors.accent : colors.backgroundSelected }]}>
      <View style={[styles.thumb, on && styles.thumbOn]} />
    </View>
  );
}

function TaskSample() {
  const colors = useTheme();
  return (
    <Frame>
      <View style={styles.titleRow}>
        <Icon name={Icons.previous} size={20} color="text" />
        <ThemedText type="heading" style={styles.flex}>
          Edit task
        </ThemedText>
        <ThemedText type="smallBold" themeColor="accentText">
          Save
        </ThemedText>
      </View>
      <View style={[styles.input, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="heading">Gym</ThemedText>
      </View>
      <ThemedText type="label" style={styles.section}>
        Repeat
      </ThemedText>
      <View style={styles.chips}>
        {['Never', 'Daily', 'Weekly', 'Monthly'].map((label) => {
          const selected = label === 'Weekly';
          return (
            <View
              key={label}
              style={[
                styles.outlineChip,
                { borderColor: selected ? colors.accent : colors.border },
                selected && { backgroundColor: colors.accent },
              ]}>
              <ThemedText type="small" themeColor={selected ? 'onAccent' : 'textSecondary'}>
                {label}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <View style={styles.weekRow}>
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => {
          const selected = day === 'Mo' || day === 'We';
          return (
            <View
              key={day}
              style={[
                styles.weekday,
                {
                  backgroundColor: selected ? colors.accent : colors.backgroundElement,
                  borderColor: selected ? colors.accent : colors.border,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'text'}>
                {day}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <View style={styles.formRow}>
        <ThemedText style={styles.flex}>Time</ThemedText>
        <FakeSwitch on />
      </View>
      <View style={styles.formRow}>
        <ThemedText style={styles.flex}>At</ThemedText>
        <View style={[styles.timeField, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
          <Icon name={Icons.time} size={16} color="accentText" />
          <ThemedText type="smallBold">18:00</ThemedText>
        </View>
      </View>
      <View style={styles.formRow}>
        <ThemedText style={styles.flex}>Alarm</ThemedText>
        <FakeSwitch on={false} />
      </View>
      <ThemedText type="small" themeColor="danger">
        Delete task
      </ThemedText>
    </Frame>
  );
}

const styles = StyleSheet.create({
  pager: {
    gap: Spacing.two,
  },
  pagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pagerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.35,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22,
  },
  frame: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
    overflow: 'hidden',
    minHeight: 420,
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
  dotSmall: {
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
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
  barTall: {
    alignSelf: 'stretch',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: Radius.medium,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.small,
    paddingVertical: Spacing.one,
  },
  todayPill: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: Spacing.half,
  },
  gridDay: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busy: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  dividerText: {
    fontSize: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  input: {
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  outlineChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  weekRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  weekday: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  track: {
    width: 40,
    height: 22,
    borderRadius: 11,
    padding: 2,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
