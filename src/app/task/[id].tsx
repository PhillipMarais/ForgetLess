import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ChipGroup } from '@/components/chip';
import { DateTimeField } from '@/components/date-time-field';
import { EditorLayout, HeaderTextButton, leaveEditor } from '@/components/editor';
import { EmptyState } from '@/components/empty-state';
import { FormRow, FormSection, FormSwitch, FormTextInput } from '@/components/form';
import { Icons } from '@/components/icon';
import { PhotoStrip } from '@/components/photo-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listAttachments, type Attachment } from '@/db/attachments';
import { deleteTask, getTask, updateTask, type Task } from '@/db/tasks';
import { useDraftPhotos } from '@/hooks/use-draft-photos';
import { nextHour, startOfDay, withTimeOf } from '@/lib/dates';
import {
  buildRRule,
  REPEAT_OPTIONS,
  repeatFrequencyOf,
  type RepeatFrequency,
} from '@/lib/recurrence';

type Draft = {
  title: string;
  notes: string;
  hasDue: boolean;
  /** Kept while the due date is switched off, so switching it back on restores it. */
  dueAt: number;
  hasTime: boolean;
  repeat: RepeatFrequency | null;
};

function draftFrom(task: Task): Draft {
  return {
    title: task.title,
    notes: task.notes ?? '',
    hasDue: task.dueAt !== null,
    dueAt: task.dueAt ?? startOfDay(),
    hasTime: task.dueAt !== null && !task.dueAllDay,
    repeat: repeatFrequencyOf(task.rrule),
  };
}

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState<
    { task: Task; attachments: Attachment[] } | null | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    (async () => {
      const task = await getTask(db, id);
      const attachments = task ? await listAttachments(db, 'task', task.id) : [];
      if (active) setLoaded(task ? { task, attachments } : null);
    })();
    return () => {
      active = false;
    };
  }, [db, id]);

  if (loaded === undefined) return <ThemedView style={styles.fill} />;
  if (loaded === null) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ title: 'Task' }} />
        <EmptyState icon={Icons.tasks} title="Task not found" message="It may have been deleted." />
      </ThemedView>
    );
  }
  return <TaskEditor key={loaded.task.id} {...loaded} />;
}

function TaskEditor({ task, attachments }: { task: Task; attachments: Attachment[] }) {
  const db = useSQLiteContext();
  const [draft, setDraft] = useState(() => draftFrom(task));
  const [saving, setSaving] = useState(false);
  const photos = useDraftPhotos(attachments);
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));
  const valid = draft.title.trim().length > 0 && !saving && !photos.busy;

  const changeHasTime = (hasTime: boolean) =>
    update({
      hasTime,
      dueAt: hasTime ? withTimeOf(draft.dueAt, nextHour()) : startOfDay(draft.dueAt),
    });

  const save = async () => {
    setSaving(true);
    await updateTask(db, task.id, {
      title: draft.title,
      notes: draft.notes.trim() || null,
      dueAt: draft.hasDue ? (draft.hasTime ? draft.dueAt : startOfDay(draft.dueAt)) : null,
      dueAllDay: draft.hasDue && !draft.hasTime,
      rrule: draft.hasDue ? buildRRule(draft.repeat) : null,
    });
    await photos.save(db, 'task', task.id);
    leaveEditor('/tasks');
  };

  const remove = async () => {
    await deleteTask(db, task.id);
    leaveEditor('/tasks');
  };

  return (
    <EditorLayout>
      <Stack.Screen
        options={{
          title: 'Edit task',
          headerRight: () => <HeaderTextButton label="Save" onPress={save} disabled={!valid} />,
        }}
      />
      <FormTextInput
        value={draft.title}
        onChangeText={(title) => update({ title })}
        placeholder="Title"
        accessibilityLabel="Title"
        variant="title"
      />

      <FormSection>
        <FormSwitch label="Due date" value={draft.hasDue} onChange={(hasDue) => update({ hasDue })} />
        {draft.hasDue ? (
          <>
            <FormRow label="Date">
              <DateTimeField
                mode="date"
                label="Due date"
                value={draft.dueAt}
                onChange={(dueAt) => update({ dueAt })}
              />
            </FormRow>
            <FormSwitch label="Time" value={draft.hasTime} onChange={changeHasTime} />
            {draft.hasTime ? (
              <FormRow label="At">
                <DateTimeField
                  mode="time"
                  label="Due time"
                  value={draft.dueAt}
                  onChange={(dueAt) => update({ dueAt })}
                />
              </FormRow>
            ) : null}
          </>
        ) : null}
      </FormSection>

      {draft.hasDue ? (
        <FormSection label="Repeat">
          <ChipGroup
            label="Repeat"
            options={REPEAT_OPTIONS}
            value={draft.repeat}
            onChange={(repeat) => update({ repeat })}
          />
          {draft.repeat ? (
            <ThemedText type="small" themeColor="textSecondary">
              Checking it off moves it to the next date.
            </ThemedText>
          ) : null}
        </FormSection>
      ) : null}

      <FormSection label="Pictures">
        <PhotoStrip draft={photos} />
      </FormSection>

      <FormSection label="Notes">
        <FormTextInput
          value={draft.notes}
          onChangeText={(notes) => update({ notes })}
          placeholder="Add notes"
          accessibilityLabel="Notes"
          multiline
        />
      </FormSection>

      <Pressable
        accessibilityRole="button"
        onPress={remove}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
        <ThemedText themeColor="danger">Delete task</ThemedText>
      </Pressable>
    </EditorLayout>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
