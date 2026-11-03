import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceDialog } from '@/components/choice-dialog';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { fontStyle, Radius, Spacing } from '@/constants/theme';
import { setAlarmOffset, skipAlarm } from '@/db/reminders';
import { useAppTheme } from '@/hooks/use-theme';
import { describeTimeUntil, type PlannedAlarm } from '@/lib/alarms';
import { formatTime } from '@/lib/dates';

type Action = 'edit' | 'skip' | 'off';

/** The date part of an alarm id ("task:<id>:<time>"): which date of a repeating item it rings for. */
function occurrenceOf(alarm: PlannedAlarm) {
  return alarm.id.slice(alarm.id.lastIndexOf(':') + 1);
}

/**
 * One of today's alarms: its time, what it's for, and on tap a choice to edit the item or
 * cancel the alarm (just this one, or all of a repeating item's alarms).
 */
export function AlarmRow({ alarm, now }: { alarm: PlannedAlarm; now: number }) {
  const db = useSQLiteContext();
  const theme = useAppTheme();
  const { colors } = theme;
  const [choosing, setChoosing] = useState(false);
  const rang = alarm.at <= now;

  const act = async (action: Action) => {
    setChoosing(false);
    if (action === 'edit') {
      if (alarm.ownerType === 'task') {
        router.push({ pathname: '/task/[id]', params: { id: alarm.ownerId } });
      } else {
        router.push({ pathname: '/event/[id]', params: { id: alarm.ownerId, occurrence: occurrenceOf(alarm) } });
      }
    } else if (action === 'skip') {
      await skipAlarm(db, alarm.id, alarm.ownerType, alarm.ownerId);
    } else {
      await setAlarmOffset(db, alarm.ownerType, alarm.ownerId, null);
    }
  };

  const kind = alarm.ownerType === 'task' ? 'task' : 'event';
  const choices = alarm.repeating
    ? [
        { label: `Edit this ${kind}`, value: 'edit' as const },
        { label: 'Cancel this alarm', value: 'skip' as const, destructive: true },
        { label: `Cancel all “${alarm.title}” alarms`, value: 'off' as const, destructive: true },
      ]
    : [
        { label: `Edit this ${kind}`, value: 'edit' as const },
        { label: 'Cancel alarm', value: 'off' as const, destructive: true },
      ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rang ? 'Rang' : 'Alarm'} at ${formatTime(alarm.at)}${rang ? '' : `, in ${describeTimeUntil(alarm.at, now)}`}, ${alarm.title}`}
        accessibilityHint="Edit or cancel this alarm"
        onPress={() => setChoosing(true)}
        style={({ pressed }) => [
          styles.row,
          { borderBottomColor: colors.border },
          rang && styles.rang,
          pressed && styles.pressed,
        ]}>
        <Icon name={rang ? Icons.alarmOff : Icons.alarm} size={24} color={rang ? 'textSecondary' : 'accentText'} />
        <View style={styles.text}>
          <View style={styles.timeRow}>
            <ThemedText style={[styles.time, fontStyle(theme, 'display', 700)]}>{formatTime(alarm.at)}</ThemedText>
            {!rang ? (
              <View style={[styles.until, { backgroundColor: colors.backgroundSelected }]}>
                <ThemedText type="smallBold" themeColor="accentText">
                  in {describeTimeUntil(alarm.at, now)}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText numberOfLines={1}>{alarm.title}</ThemedText>
          <View style={styles.meta}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {rang ? 'Rang · ' : ''}
              {alarm.detail}
            </ThemedText>
            {alarm.repeating ? <Icon name={Icons.repeat} size={14} color="textSecondary" /> : null}
          </View>
        </View>
        <Icon name={Icons.next} size={20} color="textSecondary" />
      </Pressable>
      <ChoiceDialog
        visible={choosing}
        title={`${formatTime(alarm.at)} · ${alarm.title}`}
        choices={choices}
        onChoose={act}
        onCancel={() => setChoosing(false)}
      />
    </>
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
  rang: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  time: {
    fontSize: 28,
    lineHeight: 34,
  },
  until: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
