import { router } from 'expo-router';
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
import { useSettings } from '@/hooks/use-settings';
import { useFontSize, useTheme } from '@/hooks/use-theme';
import { addDays, startOfDay } from '@/lib/dates';

const DUE_OPTIONS = [
  { label: 'No date', value: null },
  { label: 'Today', value: 0 },
  { label: 'Tomorrow', value: 1 },
] as const;

/** Days from today, or null for no due date. */
type DueDays = (typeof DUE_OPTIONS)[number]['value'];

export default function TasksScreen() {
  const { data: tasks } = useLiveQuery(['tasks', 'attachments', 'task_steps'], 'all', listTasks);

  return (
    <Screen title="Tasks">
      <AddTask />
      <FlatList
        data={tasks ?? []}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => <TaskRow task={item} showNotes />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          tasks ? (
            <EmptyState
              icon={Icons.tasks}
              title="No tasks yet"
              message="Type a task above and press enter, or tap + to add one with a time, repeat or alarm."
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
  const { settings } = useSettings();
  const fontSize = useFontSize(16);
  const [title, setTitle] = useState('');
  // "New tasks have a date" (Settings → General) starts quick-added tasks on today.
  const [dueDays, setDueDays] = useState<DueDays>(settings.taskDefaultDate ? 0 : null);
  const canAdd = title.trim().length > 0;

  // With no text, + opens the full Add task screen (repeats, time, alarm, pictures).
  const add = async () => {
    if (!canAdd) {
      router.push({ pathname: '/task/[id]', params: { id: 'new' } });
      return;
    }
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
          style={[styles.input, { color: theme.text, fontSize }]}
        />
        <IconButton
          icon={Icons.add}
          label={canAdd ? 'Add task' : 'Open the Add task screen'}
          variant="filled"
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
    paddingVertical: Spacing.two,
  },
});
