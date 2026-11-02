import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type ScrollViewInstance,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { fontStyle, Radius, Spacing } from '@/constants/theme';
import { useAppTheme, useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/dates';

const ITEM = 48;
const VISIBLE = 5;

/** Whether the phone's language writes times with AM/PM. */
export function uses12Hour() {
  const cycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h12' || cycle === 'h11';
}

const pad = (value: number) => String(value).padStart(2, '0');

type TimePickerFieldProps = {
  /** Epoch ms; only the time of day changes. */
  value: number;
  onChange: (value: number) => void;
  /** Read by screen readers. */
  label: string;
};

/** Shows a time; tapping opens a sheet with hour and minute wheels and quick picks. */
export function TimePickerField({ value, onChange, label }: TimePickerFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatTime(value)}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.field,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <Icon name={Icons.time} size={18} color="accentText" />
        <ThemedText type="defaultBold">{formatTime(value)}</ThemedText>
      </Pressable>
      {open ? (
        <TimePickerSheet
          title={label}
          value={value}
          onDone={(next) => {
            setOpen(false);
            onChange(next);
          }}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type SheetProps = {
  title: string;
  value: number;
  onDone: (value: number) => void;
  onCancel: () => void;
};

function TimePickerSheet({ title, value, onDone, onCancel }: SheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const twelve = uses12Hour();
  const start = new Date(value);
  const [hours, setHours] = useState(start.getHours());
  const [minutes, setMinutes] = useState(start.getMinutes());
  // Bumped by quick picks so the wheels scroll to the new time.
  const [jump, setJump] = useState(0);

  const set = (h: number, m: number) => {
    setHours(h);
    setMinutes(m);
    setJump((count) => count + 1);
  };

  const result = () => {
    const date = new Date(value);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  };

  const addMinutes = (amount: number) => {
    const total = (hours * 60 + minutes + amount + 24 * 60) % (24 * 60);
    set(Math.floor(total / 60), total % 60);
  };

  const now = new Date();
  const quick = [
    { label: 'Now', run: () => set(now.getHours(), now.getMinutes()) },
    { label: formatTime(new Date(2026, 0, 1, 9).getTime()), run: () => set(9, 0) },
    { label: formatTime(new Date(2026, 0, 1, 12).getTime()), run: () => set(12, 0) },
    { label: formatTime(new Date(2026, 0, 1, 17).getTime()), run: () => set(17, 0) },
    { label: formatTime(new Date(2026, 0, 1, 20).getTime()), run: () => set(20, 0) },
  ];

  const hourItems = twelve
    ? Array.from({ length: 12 }, (_, index) => String(index === 0 ? 12 : index))
    : Array.from({ length: 24 }, (_, index) => pad(index));
  const minuteItems = Array.from({ length: 60 }, (_, index) => pad(index));
  const pm = hours >= 12;

  const display = twelve
    ? `${hours % 12 === 0 ? 12 : hours % 12}:${pad(minutes)}`
    : `${pad(hours)}:${pad(minutes)}`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Spacing.three + insets.bottom },
          ]}
          accessibilityViewIsModal>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <ThemedText type="label">{title}</ThemedText>
          <View style={styles.displayRow}>
            <ThemedText style={[styles.display, fontStyle(theme, 'display', 700)]} accessibilityLiveRegion="polite">
              {display}
            </ThemedText>
            {twelve ? (
              <ThemedText type="heading" themeColor="accentText">
                {pm ? 'PM' : 'AM'}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.wheels}>
            <View
              pointerEvents="none"
              style={[styles.band, { backgroundColor: colors.backgroundSelected, borderColor: colors.accent }]}
            />
            <Wheel
              label="Hour"
              items={hourItems}
              index={twelve ? hours % 12 : hours}
              jump={jump}
              onChange={(index) => setHours(twelve ? index + (pm ? 12 : 0) : index)}
            />
            <ThemedText style={[styles.colon, fontStyle(theme, 'display', 700)]}>:</ThemedText>
            <Wheel label="Minute" items={minuteItems} index={minutes} jump={jump} onChange={setMinutes} />
            {twelve ? (
              <Wheel
                label="AM or PM"
                items={['AM', 'PM']}
                index={pm ? 1 : 0}
                jump={jump}
                onChange={(index) => setHours((hours % 12) + (index === 1 ? 12 : 0))}
              />
            ) : null}
          </View>

          <View style={styles.quickRow}>
            {quick.map((item) => (
              <QuickChip key={item.label} label={item.label} onPress={item.run} />
            ))}
          </View>
          <View style={styles.quickRow}>
            <QuickChip label="−15 min" onPress={() => addMinutes(-15)} />
            <QuickChip label="+15 min" onPress={() => addMinutes(15)} />
            <QuickChip label="+1 hour" onPress={() => addMinutes(60)} />
          </View>

          <View style={styles.buttons}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed }) => [styles.button, { borderColor: colors.border, borderWidth: 1 }, pressed && styles.pressed]}>
              <ThemedText type="defaultBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onDone(result())}
              style={({ pressed }) => [styles.button, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
              <ThemedText type="defaultBold" themeColor="onAccent">
                Set {display}
                {twelve ? ` ${pm ? 'PM' : 'AM'}` : ''}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: colors.border, backgroundColor: colors.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

type WheelProps = {
  label: string;
  items: readonly string[];
  index: number;
  /** Changes when the value is set from outside, to scroll there. */
  jump: number;
  onChange: (index: number) => void;
};

/** A scrolling column that snaps to one item; the item in the middle band is chosen. */
function Wheel({ label, items, index, jump, onChange }: WheelProps) {
  const theme = useAppTheme();
  const ref = useRef<ScrollViewInstance>(null);
  const [centered, setCentered] = useState(index);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Scroll to the value when opened and after quick picks; not while the user scrolls.
  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM, animated: jump > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  useEffect(() => () => clearTimeout(settle.current), []);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const next = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM)));
    if (next !== centered) {
      setCentered(next);
      onChange(next);
    }
    // Snap into place once scrolling stops (the browser preview has no native snapping).
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (Math.abs(y - next * ITEM) > 1) ref.current?.scrollTo({ y: next * ITEM, animated: true });
    }, 120);
  };

  const choose = (next: number) => {
    ref.current?.scrollTo({ y: next * ITEM, animated: true });
    setCentered(next);
    onChange(next);
  };

  return (
    <View style={styles.wheel} accessibilityLabel={label} accessibilityRole="adjustable"
      accessibilityValue={{ text: items[centered] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') choose(Math.min(items.length - 1, centered + 1));
        if (nativeEvent.actionName === 'decrement') choose(Math.max(0, centered - 1));
      }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={() => ref.current?.scrollTo({ y: index * ITEM, animated: false })}
        contentContainerStyle={styles.wheelContent}>
        {items.map((item, itemIndex) => {
          const distance = Math.abs(itemIndex - centered);
          return (
            <Pressable key={item} onPress={() => choose(itemIndex)} style={styles.item} importantForAccessibility="no">
              <ThemedText
                themeColor={distance === 0 ? 'text' : 'textSecondary'}
                style={[
                  styles.itemText,
                  fontStyle(theme, 'display', distance === 0 ? 700 : 500),
                  { opacity: distance === 0 ? 1 : distance === 1 ? 0.7 : 0.35 },
                ]}>
                {item}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.large * 1.5,
    borderTopRightRadius: Radius.large * 1.5,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.one,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  display: {
    fontSize: 56,
    lineHeight: 64,
  },
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM * VISIBLE,
    alignSelf: 'stretch',
  },
  band: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    top: ITEM * Math.floor(VISIBLE / 2),
    height: ITEM,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  colon: {
    fontSize: 28,
    lineHeight: 34,
    marginHorizontal: Spacing.one,
  },
  wheel: {
    width: 80,
    height: ITEM * VISIBLE,
  },
  wheelContent: {
    paddingVertical: ITEM * Math.floor(VISIBLE / 2),
  },
  item: {
    height: ITEM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 26,
    lineHeight: 32,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
  },
});
