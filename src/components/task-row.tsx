import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { deleteTask, setTaskCompleted, type Task } from '@/db/tasks';
import { useTheme } from '@/hooks/use-theme';
import { daysFromToday, formatDueLabel } from '@/lib/dates';

export function TaskRow({ task }: { task: Task }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const done = task.completedAt !== null;
  const overdue = !done && task.dueAt !== null && daysFromToday(task.dueAt) < 0;

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={task.title}
        onPress={() => setTaskCompleted(db, task.id, !done)}
        hitSlop={Spacing.two}
        style={[
          styles.checkbox,
          { borderColor: done ? theme.accent : theme.textSecondary },
          done && { backgroundColor: theme.accent },
        ]}>
        {done ? <Icon name={Icons.check} size={16} color="onAccent" /> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${task.title}`}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
        style={({ pressed }) => [styles.text, pressed && styles.pressed]}>
        <ThemedText themeColor={done ? 'textSecondary' : 'text'} style={done && styles.doneTitle}>
          {task.title}
        </ThemedText>
        {task.dueAt !== null || task.attachmentCount > 0 ? (
          <View style={styles.due}>
            {task.dueAt !== null ? (
              <ThemedText type="small" themeColor={overdue ? 'danger' : 'textSecondary'}>
                {formatDueLabel(task.dueAt, task.dueAllDay)}
              </ThemedText>
            ) : null}
            {task.rrule ? <Icon name={Icons.repeat} size={14} color="textSecondary" /> : null}
            {task.attachmentCount > 0 ? (
              <Icon name={Icons.photo} size={14} color="textSecondary" />
            ) : null}
          </View>
        ) : null}
      </Pressable>
      <IconButton
        icon={Icons.delete}
        label={`Delete ${task.title}`}
        color="textSecondary"
        onPress={() => deleteTask(db, task.id)}
      />
    </View>
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
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  due: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
});
