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
        style={styles.main}>
        <View
          style={[
            styles.checkbox,
            { borderColor: done ? theme.accent : theme.textSecondary },
            done && { backgroundColor: theme.accent },
          ]}>
          {done ? <Icon name={Icons.check} size={16} color="onAccent" /> : null}
        </View>
        <View style={styles.text}>
          <ThemedText
            themeColor={done ? 'textSecondary' : 'text'}
            style={done && styles.doneTitle}>
            {task.title}
          </ThemedText>
          {task.dueAt !== null ? (
            <ThemedText type="small" themeColor={overdue ? 'danger' : 'textSecondary'}>
              {formatDueLabel(task.dueAt, task.dueAllDay)}
            </ThemedText>
          ) : null}
        </View>
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
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
  doneTitle: {
    textDecorationLine: 'line-through',
  },
});
