import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { EventOccurrence } from '@/db/events';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatTime } from '@/lib/dates';

/** "All day", "09:00 – 10:00", or for events spanning days, how they relate to `day`. */
function timeLabel(occurrence: EventOccurrence, day?: number) {
  if (occurrence.allDay) return 'All day';
  const startsBefore = day !== undefined && occurrence.startAt < day;
  const endsAfter = day !== undefined && occurrence.endAt > addDays(day, 1);
  if (startsBefore && endsAfter) return 'All day';
  if (startsBefore) return `Until ${formatTime(occurrence.endAt)}`;
  if (endsAfter) return `From ${formatTime(occurrence.startAt)}`;
  return `${formatTime(occurrence.startAt)} – ${formatTime(occurrence.endAt)}`;
}

export function openEvent(occurrence: EventOccurrence) {
  router.push({
    pathname: '/event/[id]',
    params: { id: occurrence.eventId, occurrence: String(occurrence.originalStart) },
  });
}

type EventRowProps = {
  occurrence: EventOccurrence;
  /** Start of the day being shown, to label events that span several days. */
  day?: number;
};

export function EventRow({ occurrence, day }: EventRowProps) {
  const theme = useTheme();
  const time = timeLabel(occurrence, day);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${occurrence.title}, ${time}`}
      onPress={() => openEvent(occurrence)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={[styles.bar, { backgroundColor: theme.accent }]} />
      <View style={styles.text}>
        <ThemedText numberOfLines={1}>{occurrence.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {time}
        </ThemedText>
      </View>
      {occurrence.attachmentCount > 0 ? (
        <Icon name={Icons.photo} size={16} color="textSecondary" />
      ) : null}
      {occurrence.rrule ? <Icon name={Icons.repeat} size={16} color="textSecondary" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  text: {
    flex: 1,
  },
});
