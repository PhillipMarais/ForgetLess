import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlarmField } from '@/components/alarm-field';
import { ChipGroup } from '@/components/chip';
import { DateTimeField } from '@/components/date-time-field';
import { EditorLayout, HeaderTextButton, leaveEditor } from '@/components/editor';
import { EmptyState } from '@/components/empty-state';
import { FormRow, FormSection, FormSwitch, FormTextInput } from '@/components/form';
import { Icon, Icons } from '@/components/icon';
import { PhotoStrip } from '@/components/photo-strip';
import { MonthDayPicker, WeekdayPicker } from '@/components/repeat-pickers';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { listAttachments, type Attachment } from '@/db/attachments';
import { getAlarmOffset, setAlarmOffset } from '@/db/reminders';
import { createTask, deleteTask, getTask, updateTask, type Task } from '@/db/tasks';
import { useDraftPhotos } from '@/hooks/use-draft-photos';
import { useTheme } from '@/hooks/use-theme';
import { formatDueLabel } from '@/lib/dates';
import { describeRepeat, ordinal, REPEAT_OPTIONS } from '@/lib/recurrence';
import { resolveSchedule, sameSchedule, scheduleFrom, type TaskSchedule } from '@/lib/task-schedule';

type Loaded = { task: Task | null; attachments: Attachment[]; alarm: number | null };

export default function TaskScreen() {
  // `title` pre-fills a new task typed on the Tasks tab.
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const db = useSQLiteContext();
  const isNew = id === 'new';
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(
    isNew ? { task: null, attachments: [], alarm: null } : undefined,
  );

  useEffect(() => {
    if (isNew) return;
    let active = true;
    (async () => {
      const task = await getTask(db, id);
      const attachments = task ? await listAttachments(db, 'task', task.id) : [];
      const alarm = task ? await getAlarmOffset(db, 'task', task.id) : null;
      if (active) setLoaded(task ? { task, attachments, alarm } : null);
    })();
    return () => {
      active = false;
    };
  }, [db, id, isNew]);

  if (loaded === undefined) return <ThemedView style={styles.fill} />;
  if (loaded === null) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ title: 'Task' }} />
        <EmptyState icon={Icons.tasks} title="Task not found" message="It may have been deleted." />
      </ThemedView>
    );
  }
  return <TaskEditor key={id} {...loaded} initialTitle={title ?? ''} />;
}

type Draft = TaskSchedule & { title: string; notes: string; alarm: number | null };

function TaskEditor({ task, attachments, alarm, initialTitle }: Loaded & { initialTitle: string }) {
  const db = useSQLiteContext();
  const [initial] = useState<Draft>(() => ({
    ...scheduleFrom(task),
    title: task?.title ?? initialTitle,
    notes: task?.notes ?? '',
    alarm,
  }));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const photos = useDraftPhotos(attachments);
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));
  const valid = draft.title.trim().length > 0 && !saving && !photos.busy;

  const { repeat } = draft;
  const dated = repeat !== null || draft.hasDate;
  // Keep an existing task's due date (it may be overdue) unless its schedule was changed.
  const resolved =
    task && sameSchedule(draft, initial)
      ? { dueAt: task.dueAt, dueAllDay: task.dueAllDay, rrule: task.rrule }
      : resolveSchedule(draft);

  const save = async () => {
    setSaving(true);
    const input = { title: draft.title, notes: draft.notes.trim() || null, ...resolved };
    const taskId = task ? task.id : await createTask(db, input);
    if (task) await updateTask(db, task.id, input);
    await setAlarmOffset(db, 'task', taskId, dated && draft.hasTime ? draft.alarm : null);
    await photos.save(db, 'task', taskId);
    leaveEditor('/tasks');
  };

  const remove = async () => {
    if (task) await deleteTask(db, task.id);
    leaveEditor('/tasks');
  };

  return (
    <EditorLayout>
      <Stack.Screen
        options={{
          title: task ? 'Edit task' : 'Add task',
          headerRight: () => <HeaderTextButton label="Save" onPress={save} disabled={!valid} />,
        }}
      />
      <FormTextInput
        value={draft.title}
        onChangeText={(title) => update({ title })}
        placeholder="What needs doing?"
        accessibilityLabel="Title"
        autoFocus={!task && !initialTitle}
        variant="title"
      />

      <FormSection label="Repeat">
        <ChipGroup label="Repeat" options={REPEAT_OPTIONS} value={repeat} onChange={(next) => update({ repeat: next })} />
      </FormSection>

      <FormSection label={scheduleLabel(draft)}>
        {repeat === null ? (
          <>
            <FormSwitch label="Date" value={draft.hasDate} onChange={(hasDate) => update({ hasDate })} />
            {draft.hasDate ? (
              <FormRow label="Day">
                <DateTimeField mode="date" label="Date" value={draft.date} onChange={(date) => update({ date })} />
              </FormRow>
            ) : null}
          </>
        ) : null}
        {repeat === 'daily' ? (
          <ThemedText type="small" themeColor="textSecondary">
            Every day, starting today.
          </ThemedText>
        ) : null}
        {repeat === 'weekly' ? (
          <WeekdayPicker value={draft.weekdays} onChange={(weekdays) => update({ weekdays })} />
        ) : null}
        {repeat === 'monthly' ? (
          <>
            <MonthDayPicker value={draft.monthDay} onChange={(monthDay) => update({ monthDay })} />
            {draft.monthDay > 28 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Months without a {ordinal(draft.monthDay)} are skipped.
              </ThemedText>
            ) : null}
          </>
        ) : null}
        {repeat === 'yearly' ? (
          <FormRow label="Every year on">
            <DateTimeField mode="date" label="Date" value={draft.date} onChange={(date) => update({ date })} />
          </FormRow>
        ) : null}

        {dated ? (
          <>
            <FormSwitch label="Time" value={draft.hasTime} onChange={(hasTime) => update({ hasTime })} />
            {draft.hasTime ? (
              <FormRow label="At">
                <DateTimeField mode="time" label="Time" value={draft.time} onChange={(time) => update({ time })} />
              </FormRow>
            ) : null}
            {draft.hasTime ? (
              <AlarmField value={draft.alarm} onChange={(next) => update({ alarm: next })} />
            ) : null}
          </>
        ) : null}
      </FormSection>

      {resolved.dueAt !== null ? <ScheduleSummary resolved={resolved} /> : null}

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

      {task ? (
        <Pressable
          accessibilityRole="button"
          onPress={remove}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
          <ThemedText themeColor="danger">Delete task</ThemedText>
        </Pressable>
      ) : null}
    </EditorLayout>
  );
}

function scheduleLabel({ repeat }: Draft) {
  if (repeat === 'weekly') return 'On these days';
  if (repeat === 'monthly') return 'On this day of the month';
  if (repeat === 'yearly') return 'Date';
  if (repeat === 'daily') return 'Days';
  return 'When';
}

/** "Every Mon, Wed · Next: Wed 4 Nov 08:00". */
function ScheduleSummary({ resolved }: { resolved: ReturnType<typeof resolveSchedule> }) {
  const theme = useTheme();
  return (
    <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
      <Icon name={resolved.rrule ? Icons.repeat : Icons.calendar} size={18} color="accentText" />
      <View style={styles.flex}>
        {resolved.rrule ? <ThemedText type="smallBold">{describeRepeat(resolved.rrule)}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary">
          {resolved.rrule ? 'Next: ' : 'Due '}
          {formatDueLabel(resolved.dueAt!, resolved.dueAllDay)}
          {resolved.rrule ? ' · Ticking it off moves it to the next date.' : ''}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
