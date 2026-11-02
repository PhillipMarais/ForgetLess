import type { SQLiteDatabase } from 'expo-sqlite';

import { showToast } from '@/components/toast';
import type { ReminderOwner } from '@/db/reminders';

import { describeTimeUntil, planAlarms } from './alarms';

/**
 * After saving an item with an alarm, says how long until it rings, like the phone's clock
 * app does ("Alarm set for 2 hours and 5 minutes from now"). Never holds up saving.
 */
export async function announceAlarm(db: SQLiteDatabase, ownerType: ReminderOwner, ownerId: string) {
  try {
    const [next] = await planAlarms(db, Date.now(), { ownerType, ownerId });
    if (next) showToast(`Alarm set for ${describeTimeUntil(next.at)} from now`);
    else showToast('This alarm’s time has already passed, so it won’t ring');
  } catch (error) {
    console.warn('Could not work out the next alarm', error);
  }
}
