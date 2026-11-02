import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { ChipGroup } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { Spacing } from '@/constants/theme';
import { createTask, listTasks } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useTheme } from '@/hooks/use-theme';
import { addDays, startOfDay } from '@/lib/dates';

const DUE_OPTIONS = [
  { label: 'No date', value: null },
  { label: 'Today', value: 0 },
  { label: 'Tomorrow', value: 1 },
] as const;

/** Days from today, or null for no due date. */
type DueDays = (typeof DUE_OPTIONS)[number]['value'];

export default function TasksScreen() {
  const { data: tasks } = useLiveQuery(['tasks'], 'all', listTasks);

  return (
    <Screen title="Tasks">
      <AddTask />
      <FlatList
        data={tasks ?? []}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => <TaskRow task={item} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          tasks ? (
            <EmptyState
              icon={Icons.tasks}
              title="No tasks yet"
              message="Type a task above and press enter to add it."
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

function AddTask() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [dueDays, setDueDays] = useState<DueDays>(null);
  const canAdd = title.trim().length > 0;

  const add = async () => {
    if (!canAdd) return;
    await createTask(db, {
      title,
      dueAt: dueDays === null ? null : addDays(startOfDay(), dueDays),
      dueAllDay: dueDays !== null,
    });
    setTitle('');
  };

  return (
    <View style={styles.add}>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={add}
          placeholder="Add a task"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          submitBehavior="submit"
          accessibilityLabel="New task title"
          style={[styles.input, { color: theme.text }]}
        />
        <IconButton
          icon={Icons.add}
          label="Add task"
          variant="filled"
          disabled={!canAdd}
          onPress={add}
        />
      </View>
      <ChipGroup label="Due date" options={DUE_OPTIONS} value={dueDays} onChange={setDueDays} />
    </View>
  );
}

const styles = StyleSheet.create({
  add: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
});
