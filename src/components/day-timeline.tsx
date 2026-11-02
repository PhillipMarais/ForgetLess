import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { openEvent } from '@/components/event-row';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { EventOccurrence } from '@/db/events';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, startOfDay } from '@/lib/dates';
import { layoutTimeline } from '@/lib/timeline';

const HOUR_HEIGHT = 56;
const LABEL_WIDTH = 56;
const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

/** '9 AM' / '21' style hour label, following the device's 12/24-hour preference. */
function hourLabel(time: number) {
  return new Date(time).toLocaleTimeString(undefined, { hour: 'numeric' });
}

type DayTimelineProps = {
  day: number;
  /** Timed (not all-day) occurrences overlapping the day. */
  occurrences: readonly EventOccurrence[];
};

/** A scrollable 24-hour day with events placed by time. Tap an empty hour to add an event. */
export function DayTimeline({ day, occurrences }: DayTimelineProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const isToday = day === startOfDay();
  const now = useNow(isToday);
  const nowMinutes = (now - day) / MINUTE;

  const placements = layoutTimeline(
    occurrences.map((occurrence) => ({
      key: `${occurrence.eventId}:${occurrence.originalStart}`,
      start: Math.max(0, (occurrence.startAt - day) / MINUTE),
      end: Math.min(DAY_MINUTES, (occurrence.endAt - day) / MINUTE),
    })),
  );
  const byKey = new Map(
    occurrences.map((occurrence) => [`${occurrence.eventId}:${occurrence.originalStart}`, occurrence]),
  );
  const trackWidth = Math.max(0, width - LABEL_WIDTH - Spacing.two);

  // Open at 07:00, or an hour before now on today. Scrolled in code once laid out, because
  // the initial contentOffset prop isn't honoured on every platform.
  const firstHour = isToday ? Math.max(0, Math.floor(nowMinutes / 60) - 1) : 7;
  const scroll = useRef<ScrollViewInstance>(null);
  const scrolledFor = useRef<number | null>(null);

  return (
    <ScrollView
      ref={scroll}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        if (scrolledFor.current !== day) {
          scrolledFor.current = day;
          scroll.current?.scrollTo({ y: firstHour * HOUR_HEIGHT, animated: false });
        }
      }}>
      <View style={{ height: 24 * HOUR_HEIGHT }}>
        {Array.from({ length: 24 }, (_, hour) => {
          const start = new Date(day).setHours(hour, 0, 0, 0);
          return (
            <Pressable
              key={hour}
              accessibilityRole="button"
              accessibilityLabel={`Add event at ${formatTime(start)}`}
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: 'new', start: String(start) },
                })
              }
              style={({ pressed }) => [
                styles.hour,
                { top: hour * HOUR_HEIGHT, borderTopColor: theme.border },
                pressed && { backgroundColor: theme.backgroundElement },
              ]}>
              <ThemedText type="label" themeColor="textSecondary" style={styles.hourLabel}>
                {hour === 0 ? '' : hourLabel(start)}
              </ThemedText>
            </Pressable>
          );
        })}

        {placements.map((placement) => {
          const occurrence = byKey.get(placement.key)!;
          const columnWidth = trackWidth / placement.columns;
          const top = (placement.start / 60) * HOUR_HEIGHT;
          const height = Math.max(24, ((placement.end - placement.start) / 60) * HOUR_HEIGHT - 2);
          return (
            <Pressable
              key={placement.key}
              accessibilityRole="button"
              accessibilityLabel={`${occurrence.title}, ${formatTime(occurrence.startAt)} to ${formatTime(occurrence.endAt)}`}
              onPress={() => openEvent(occurrence)}
              style={({ pressed }) => [
                styles.event,
                {
                  top,
                  height,
                  left: LABEL_WIDTH + placement.column * columnWidth,
                  width: columnWidth - 2,
                  // 15% tint of the accent, with a solid accent edge.
                  backgroundColor: `${theme.accent}26`,
                  borderLeftColor: theme.accent,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" numberOfLines={height > 44 ? 2 : 1}>
                {occurrence.title}
              </ThemedText>
              {height > 44 ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {formatTime(occurrence.startAt)} – {formatTime(occurrence.endAt)}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}

        {isToday ? (
          <View
            pointerEvents="none"
            style={[styles.nowLine, { top: (nowMinutes / 60) * HOUR_HEIGHT }]}>
            <View style={[styles.nowDot, { backgroundColor: theme.danger }]} />
            <View style={[styles.nowRule, { backgroundColor: theme.danger }]} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hour: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hourLabel: {
    width: LABEL_WIDTH - Spacing.two,
    textAlign: 'right',
    fontSize: 10,
    marginTop: -8,
    letterSpacing: 0,
  },
  event: {
    position: 'absolute',
    borderRadius: Radius.small,
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  nowLine: {
    position: 'absolute',
    left: LABEL_WIDTH - 5,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -5,
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nowRule: {
    flex: 1,
    height: 2,
  },
});
