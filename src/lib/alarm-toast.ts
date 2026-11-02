import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform, ToastAndroid } from 'react-native';

import type { ReminderOwner } from '@/db/reminders';

import { describeTimeUntil, planAlarms } from './alarms';

/**
 * After saving an item with an alarm, says how long until it rings, like the phone's clock
 * app does ("Alarm set for 2 hours and 5 minutes from now"). Android only.
 */
export async function announceAlarm(db: SQLiteDatabase, ownerType: ReminderOwner, ownerId: string) {
  if (Platform.OS !== 'android') return;
  const [next] = await planAlarms(db, Date.now(), { ownerType, ownerId });
  if (!next) return;
  ToastAndroid.show(`Alarm set for ${describeTimeUntil(next.at)} from now`, ToastAndroid.SHORT);
}
