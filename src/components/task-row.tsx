import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/choice-dialog';
import { CoverThumb } from '@/components/cover-thumb';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { SwipeToDismiss } from '@/components/swipe-to-dismiss';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteTask, toggleTaskEntry, type Task } from '@/db/tasks';
import { useTheme } from '@/hooks/use-theme';
import { daysFromToday, formatDueLabel } from '@/lib/dates';

type TaskRowProps = {
  task: Task;
  /**
   * Given on Today: a ticked-off task can be swiped left to clear it from the list.
   * Elsewhere done tasks just stay struck through.
   */
  onDismiss?: () => void;
  /** Show the first line of the task's notes under its title (default on). */
  showNotes?: boolean;
};

export function TaskRow({ task, onDismiss, showNotes = true }: TaskRowProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const done = task.completedAt !== null;
  const upcoming = task.occurrence === 'upcoming';
  const overdue = !done && !upcoming && task.dueAt !== null && daysFromToday(task.dueAt) < 0;
  const notes = showNotes ? task.notes?.trim().split('\n')[0] : undefined;

  return (
    <SwipeToDismiss enabled={done && onDismiss !== undefined} onDismiss={() => onDismiss?.()} hint="Clear from Today">
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        {upcoming ? (
          // A later date of a repeating task: it can be ticked off once it is due.
          <View
            accessibilityLabel="Repeats; can be ticked off once it's due"
            style={[styles.checkbox, styles.upcoming, { borderColor: theme.border }]}>
            <Icon name={Icons.repeat} size={12} color="textSecondary" />
          </View>
        ) : (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={task.title}
            onPress={() => toggleTaskEntry(db, task)}
            hitSlop={Spacing.two}
            style={[
              styles.checkbox,
              { borderColor: done ? theme.accent : theme.textSecondary },
              done && { backgroundColor: theme.accent },
            ]}>
            {done ? <Icon name={Icons.check} size={16} color="onAccent" /> : null}
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${task.title}`}
          onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
          <View style={styles.text}>
            <ThemedText themeColor={done || upcoming ? 'textSecondary' : 'text'} style={done && styles.struck}>
              {task.title}
            </ThemedText>
            {notes ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
                style={done && styles.struck}>
                {notes}
              </ThemedText>
            ) : null}
            {task.dueAt !== null ? (
              <View style={styles.meta}>
                <ThemedText type="small" themeColor={overdue ? 'danger' : 'textSecondary'}>
                  {done && task.occurrence === 'done' ? 'Done · ' : ''}
                  {formatDueLabel(task.dueAt, task.dueAllDay)}
                </ThemedText>
                {task.rrule ? <Icon name={Icons.repeat} size={14} color="textSecondary" /> : null}
              </View>
            ) : null}
          </View>
          {task.coverUri ? <CoverThumb uri={task.coverUri} count={task.attachmentCount} /> : null}
        </Pressable>
        {task.occurrence === null ? (
          <IconButton
            icon={Icons.delete}
            label={`Delete ${task.title}`}
            color="textSecondary"
            onPress={() => setConfirming(true)}
          />
        ) : null}
        {confirming ? (
          <ConfirmDialog
            visible
            title={`Delete “${task.title}”?`}
            confirmLabel="Delete task"
            onConfirm={() => {
              setConfirming(false);
              deleteTask(db, task.id);
            }}
            onCancel={() => setConfirming(false)}
          />
        ) : null}
      </View>
    </SwipeToDismiss>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcoming: {
    borderStyle: 'dashed',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
});
