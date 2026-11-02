import type { SQLiteDatabase } from 'expo-sqlite';

import { notifyChange } from './changes';
import { newId, now } from './ids';

/**
 * Alarms on tasks and events, in the `reminders` table (kind 'alarm'). An item has at most
 * one alarm, ringing `offsetMinutes` before its time (0 = at the time).
 */

export type ReminderOwner = 'task' | 'event';

export async function getAlarmOffset(
  db: SQLiteDatabase,
  ownerType: ReminderOwner,
  ownerId: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ offset_minutes: number }>(
    `SELECT offset_minutes FROM reminders
     WHERE owner_type = ? AND owner_id = ? AND kind = 'alarm' AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    ownerType,
    ownerId,
  );
  return row ? row.offset_minutes : null;
}

/** Sets the item's alarm, or removes it when `offsetMinutes` is null. */
export async function setAlarmOffset(
  db: SQLiteDatabase,
  ownerType: ReminderOwner,
  ownerId: string,
  offsetMinutes: number | null,
) {
  const current = await getAlarmOffset(db, ownerType, ownerId);
  if (current === offsetMinutes) return;
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE reminders SET deleted_at = ?, updated_at = ?
       WHERE owner_type = ? AND owner_id = ? AND kind = 'alarm' AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      ownerType,
      ownerId,
    );
    if (offsetMinutes !== null) {
      await db.runAsync(
        `INSERT INTO reminders (id, owner_type, owner_id, offset_minutes, kind, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'alarm', ?, ?)`,
        newId(),
        ownerType,
        ownerId,
        offsetMinutes,
        timestamp,
        timestamp,
      );
    }
  });
  notifyChange('reminders');
}

/** A task or event with an alarm, as the alarm scheduler needs it. */
export type AlarmSource = {
  ownerType: ReminderOwner;
  ownerId: string;
  offsetMinutes: number;
};

/** Every live alarm on a task or event that still exists. */
export async function listAlarmSources(db: SQLiteDatabase): Promise<AlarmSource[]> {
  const rows = await db.getAllAsync<{
    owner_type: ReminderOwner;
    owner_id: string;
    offset_minutes: number;
  }>(
    `SELECT r.owner_type, r.owner_id, r.offset_minutes FROM reminders r
     WHERE r.kind = 'alarm' AND r.deleted_at IS NULL AND (
       (r.owner_type = 'task' AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = r.owner_id AND t.deleted_at IS NULL))
       OR (r.owner_type = 'event' AND EXISTS (SELECT 1 FROM events e WHERE e.id = r.owner_id AND e.deleted_at IS NULL))
     )`,
  );
  return rows.map((row) => ({
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    offsetMinutes: row.offset_minutes,
  }));
}

/** Choices for "Alarm" in the task and event editors. */
export const ALARM_OFFSETS: readonly { label: string; value: number }[] = [
  { label: 'At the time', value: 0 },
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
];
