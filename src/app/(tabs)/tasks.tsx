import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createTask, listTasks } from '@/db/tasks';
import { useLiveQuery } from '@/db/use-live-query';
import { useTheme } from '@/hooks/use-theme';
import { addDays, startOfDay } from '@/lib/dates';

const DUE_OPTIONS = [
  { label: 'No date', days: null },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
] as const;

type DueDays = (typeof DUE_OPTIONS)[number]['days'];

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
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Due date">
        {DUE_OPTIONS.map((option) => {
          const selected = option.days === dueDays;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setDueDays(option.days)}
              style={[
                styles.chip,
                { borderColor: selected ? theme.accent : theme.border },
                selected && { backgroundColor: theme.accent },
              ]}>
              <ThemedText type="small" themeColor={selected ? 'onAccent' : 'textSecondary'}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
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
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
