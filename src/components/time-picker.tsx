import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type ScrollViewInstance,
  type NativeSyntheticEvent,
} from 'react-native';

import { BottomSheet, SheetDragArea, useSheetClose } from '@/components/bottom-sheet';
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
    <BottomSheet onClose={onCancel} closeLabel="Cancel">
      <SheetDragArea handle>
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
      </SheetDragArea>

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
          loop
          onChange={(index) => setHours(twelve ? index + (pm ? 12 : 0) : index)}
        />
        <ThemedText style={[styles.colon, fontStyle(theme, 'display', 700)]}>:</ThemedText>
        <Wheel label="Minute" items={minuteItems} index={minutes} jump={jump} loop onChange={setMinutes} />
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

      <SheetDragArea>
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
        <SheetButtons
          confirm={`Set ${display}${twelve ? ` ${pm ? 'PM' : 'AM'}` : ''}`}
          onConfirm={() => onDone(result())}
        />
      </SheetDragArea>
    </BottomSheet>
  );
}

/** Cancel and confirm buttons that slide the sheet away first. */
function SheetButtons({ confirm, onConfirm }: { confirm: string; onConfirm: () => void }) {
  const colors = useTheme();
  const close = useSheetClose();
  return (
    <View style={styles.buttons}>
      <Pressable
        accessibilityRole="button"
        onPress={() => close()}
        style={({ pressed }) => [styles.button, { borderColor: colors.border, borderWidth: 1 }, pressed && styles.pressed]}>
        <ThemedText type="defaultBold">Cancel</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => close(onConfirm)}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
        <ThemedText type="defaultBold" themeColor="onAccent">
          {confirm}
        </ThemedText>
      </Pressable>
    </View>
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
  /** Wrap around: after the last item comes the first again (hours, minutes). */
  loop?: boolean;
  onChange: (index: number) => void;
};

/** How many copies of a looping wheel's items are drawn; it re-centres on the middle copy. */
const CYCLES = 7;

/** A scrolling column that snaps to one item; the item in the middle band is chosen. */
function Wheel({ label, items, index, jump, loop = false, onChange }: WheelProps) {
  const theme = useAppTheme();
  const ref = useRef<ScrollViewInstance>(null);
  const count = items.length;
  const cycles = loop ? CYCLES : 1;
  const middle = loop ? Math.floor(CYCLES / 2) * count : 0;
  // Position in the drawn list (several copies when looping); the value is position % count.
  const [position, setPosition] = useState(middle + index);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const value = position % count;

  // While the wheel scrolls itself to a value (quick picks, taps), the scroll events it passes
  // on the way are ignored, so they can't change the value it is heading for.
  const moving = useRef<{ target: number; until: number } | null>(null);

  const scrollTo = (next: number, animated: boolean) => {
    moving.current = animated ? { target: next, until: Date.now() + 800 } : null;
    ref.current?.scrollTo({ y: next * ITEM, animated });
  };

  // Quick picks move the wheel to the new value…
  const [seenJump, setSeenJump] = useState(jump);
  if (jump !== seenJump) {
    setSeenJump(jump);
    setPosition(middle + index);
  }

  // …and scroll there; so does opening. Not while the user scrolls.
  useEffect(() => {
    scrollTo(middle + index, jump > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  useEffect(() => () => clearTimeout(settle.current), []);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const heading = moving.current;
    if (heading) {
      const arrived = Math.abs(y - heading.target * ITEM) <= 1;
      if (!arrived && Date.now() < heading.until) return;
      moving.current = null;
    }
    const next = Math.max(0, Math.min(count * cycles - 1, Math.round(y / ITEM)));
    if (next !== position) {
      setPosition(next);
      if (next % count !== value) onChange(next % count);
    }
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (Math.abs(y - next * ITEM) > 1) {
        // Snap into place once scrolling stops (the browser preview has no native snapping).
        scrollTo(next, true);
      } else if (loop && Math.floor(next / count) !== Math.floor(middle / count)) {
        // Jump back to the same item in the middle copy, so there is always more to scroll.
        const centred = middle + (next % count);
        setPosition(centred);
        scrollTo(centred, false);
      }
    }, 120);
  };

  const choose = (next: number) => {
    scrollTo(next, true);
    setPosition(next);
    onChange(next % count);
  };

  const step = (by: number) =>
    choose(loop ? middle + ((value + by + count) % count) : Math.max(0, Math.min(count - 1, value + by)));

  return (
    <View style={styles.wheel} accessibilityLabel={label} accessibilityRole="adjustable"
      accessibilityValue={{ text: items[value] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'increment') step(1);
        if (nativeEvent.actionName === 'decrement') step(-1);
      }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={() => scrollTo(position, false)}
        contentContainerStyle={styles.wheelContent}>
        {Array.from({ length: count * cycles }, (_, itemIndex) => {
          const distance = Math.abs(itemIndex - position);
          return (
            <Pressable key={itemIndex} onPress={() => choose(itemIndex)} style={styles.item} importantForAccessibility="no">
              <ThemedText
                themeColor={distance === 0 ? 'text' : 'textSecondary'}
                style={[
                  styles.itemText,
                  fontStyle(theme, 'display', distance === 0 ? 700 : 500),
                  { opacity: distance === 0 ? 1 : distance === 1 ? 0.7 : 0.35 },
                ]}>
                {items[itemIndex % count]}
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
