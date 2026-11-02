import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ChipGroup } from '@/components/chip';
import { ChoiceDialog, type Choice } from '@/components/choice-dialog';
import { DateTimeField } from '@/components/date-time-field';
import { EditorLayout, HeaderTextButton, leaveEditor } from '@/components/editor';
import { EmptyState } from '@/components/empty-state';
import { FormRow, FormSection, FormSwitch, FormTextInput } from '@/components/form';
import { Icons } from '@/components/icon';
import { PhotoStrip } from '@/components/photo-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  cancelOccurrence,
  createEvent,
  deleteEvent,
  editOccurrence,
  getEvent,
  getOccurrence,
  updateEvent,
  type CalendarEvent,
  type EventInput,
  type EventOccurrence,
} from '@/db/events';
import { listAttachments, type Attachment } from '@/db/attachments';
import { useDraftPhotos } from '@/hooks/use-draft-photos';
import { addDays, nextHour, startOfDay } from '@/lib/dates';
import {
  buildRRule,
  REPEAT_OPTIONS,
  repeatFrequencyOf,
  shiftWallClock,
  type RepeatFrequency,
} from '@/lib/recurrence';

const HOUR = 60 * 60 * 1000;

/**
 * What the form edits. For all-day events `endAt` is the last day (inclusive);
 * the database stores the midnight after it.
 */
type Draft = {
  title: string;
  notes: string;
  allDay: boolean;
  startAt: number;
  endAt: number;
  repeat: RepeatFrequency | null;
};

type Existing = { event: CalendarEvent; occurrence: EventOccurrence; attachments: Attachment[] };

type Scope = 'one' | 'all';

/** 09:00 on the day containing `time`: the default start for events on other days. */
function at9(time: number) {
  return new Date(time).setHours(9, 0, 0, 0);
}

function newDraft(day: number | undefined): Draft {
  const today = startOfDay();
  const startAt = day === undefined || day === today ? nextHour() : at9(day);
  return { title: '', notes: '', allDay: false, startAt, endAt: startAt + HOUR, repeat: null };
}

function draftFrom({ event, occurrence }: Existing): Draft {
  return {
    title: occurrence.title,
    notes: occurrence.notes ?? '',
    allDay: occurrence.allDay,
    startAt: occurrence.startAt,
    endAt: occurrence.allDay ? addDays(occurrence.endAt, -1) : occurrence.endAt,
    repeat: repeatFrequencyOf(event.rrule),
  };
}

function toInput(draft: Draft): EventInput {
  return {
    title: draft.title,
    notes: draft.notes.trim() || null,
    allDay: draft.allDay,
    startAt: draft.allDay ? startOfDay(draft.startAt) : draft.startAt,
    endAt: draft.allDay ? addDays(startOfDay(draft.endAt), 1) : draft.endAt,
    rrule: buildRRule(draft.repeat),
  };
}

export default function EventScreen() {
  const params = useLocalSearchParams<{ id: string; occurrence?: string; date?: string }>();
  const db = useSQLiteContext();
  const [existing, setExisting] = useState<Existing | null | undefined>(undefined);
  const isNew = params.id === 'new';

  useEffect(() => {
    if (isNew) return;
    let active = true;
    (async () => {
      const event = await getEvent(db, params.id);
      const occurrence = event
        ? await getOccurrence(db, event.id, Number(params.occurrence ?? event.startAt))
        : null;
      const attachments = event ? await listAttachments(db, 'event', event.id) : [];
      if (active) setExisting(event && occurrence ? { event, occurrence, attachments } : null);
    })();
    return () => {
      active = false;
    };
  }, [db, isNew, params.id, params.occurrence]);

  if (isNew) {
    const day = params.date ? Number(params.date) : undefined;
    return <EventEditor initial={newDraft(day)} />;
  }
  if (existing === undefined) return <ThemedView style={styles.fill} />;
  if (existing === null) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ title: 'Event' }} />
        <EmptyState icon={Icons.calendar} title="Event not found" message="It may have been deleted." />
      </ThemedView>
    );
  }
  return <EventEditor initial={draftFrom(existing)} existing={existing} />;
}

function EventEditor({ initial, existing }: { initial: Draft; existing?: Existing }) {
  const db = useSQLiteContext();
  const [draft, setDraft] = useState(initial);
  const [dialog, setDialog] = useState<'save' | 'delete' | null>(null);
  const [saving, setSaving] = useState(false);
  const photos = useDraftPhotos(existing?.attachments ?? []);

  const repeating = existing?.event.rrule != null;
  const valid =
    draft.title.trim().length > 0 && draft.endAt >= draft.startAt && !saving && !photos.busy;
  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  // Moving the start keeps the duration, like most calendars.
  const changeStart = (startAt: number) =>
    update({ startAt, endAt: draft.endAt + (startAt - draft.startAt) });

  const changeAllDay = (allDay: boolean) => {
    if (allDay) update({ allDay, startAt: startOfDay(draft.startAt), endAt: startOfDay(draft.endAt) });
    else {
      const startAt = at9(draft.startAt);
      update({ allDay, startAt, endAt: startAt + HOUR });
    }
  };

  const save = async (scope: Scope) => {
    setDialog(null);
    setSaving(true);
    const input = toInput(draft);
    const eventId = existing ? await saveExisting(existing, input, scope) : await createEvent(db, input);
    // Pictures belong to the whole event, whichever scope was chosen.
    await photos.save(db, 'event', eventId);
    leaveEditor('/calendar');
  };

  const saveExisting = async ({ event, occurrence }: Existing, input: EventInput, scope: Scope) => {
    if (!repeating) {
      await updateEvent(db, event.id, input);
    } else if (scope === 'one') {
      await editOccurrence(db, event.id, occurrence.originalStart, input);
    } else {
      // The form shows this occurrence, which may have one-off changes. Only fields edited
      // now go to the series; untouched ones keep the series' own values.
      const timesEdited =
        draft.startAt !== initial.startAt ||
        draft.endAt !== initial.endAt ||
        draft.allDay !== initial.allDay;
      const startAt = timesEdited
        ? shiftWallClock(event.startAt, occurrence.startAt, input.startAt)
        : event.startAt;
      await updateEvent(db, event.id, {
        ...input,
        title: draft.title !== initial.title ? input.title : event.title,
        notes: draft.notes !== initial.notes ? input.notes : event.notes,
        startAt,
        endAt: timesEdited ? startAt + (input.endAt - input.startAt) : event.endAt,
      });
    }
    return event.id;
  };

  const remove = async (scope: Scope) => {
    setDialog(null);
    if (!existing) return;
    if (repeating && scope === 'one') {
      await cancelOccurrence(db, existing.event.id, existing.occurrence.originalStart);
    } else {
      await deleteEvent(db, existing.event.id);
    }
    leaveEditor('/calendar');
  };

  const onSavePress = () => {
    // Changing the repeat rule or all-day only makes sense for the whole series.
    const seriesOnly = draft.repeat !== initial.repeat || draft.allDay !== initial.allDay;
    if (repeating && !seriesOnly) setDialog('save');
    else save('all');
  };

  const saveChoices: Choice<Scope>[] = [
    { label: 'This event', value: 'one' },
    { label: 'All events', value: 'all' },
  ];
  const deleteChoices: Choice<Scope>[] = [
    { label: 'Delete this event', value: 'one', destructive: true },
    { label: 'Delete all events', value: 'all', destructive: true },
  ];

  return (
    <EditorLayout>
      <Stack.Screen
        options={{
          title: existing ? 'Edit event' : 'New event',
          headerRight: () => <HeaderTextButton label="Save" onPress={onSavePress} disabled={!valid} />,
        }}
      />
      <FormTextInput
        value={draft.title}
        onChangeText={(title) => update({ title })}
        placeholder="Title"
        accessibilityLabel="Title"
        autoFocus={!existing}
        style={styles.title}
      />

      <FormSection>
        <FormSwitch label="All day" value={draft.allDay} onChange={changeAllDay} />
        <FormRow label="Starts">
          <DateTimeField mode="date" label="Start date" value={draft.startAt} onChange={changeStart} />
          {!draft.allDay ? (
            <DateTimeField mode="time" label="Start time" value={draft.startAt} onChange={changeStart} />
          ) : null}
        </FormRow>
        <FormRow label="Ends">
          <DateTimeField
            mode="date"
            label="End date"
            value={draft.endAt}
            onChange={(endAt) => update({ endAt })}
          />
          {!draft.allDay ? (
            <DateTimeField
              mode="time"
              label="End time"
              value={draft.endAt}
              onChange={(endAt) => update({ endAt })}
            />
          ) : null}
        </FormRow>
        {draft.endAt < draft.startAt ? (
          <ThemedText type="small" themeColor="danger">
            The end is before the start.
          </ThemedText>
        ) : null}
      </FormSection>

      <FormSection label="Repeat">
        <ChipGroup
          label="Repeat"
          options={REPEAT_OPTIONS}
          value={draft.repeat}
          onChange={(repeat) => update({ repeat })}
        />
      </FormSection>

      <FormSection label="Pictures">
        <PhotoStrip
          photos={photos.photos}
          onAdd={photos.add}
          onRemove={photos.remove}
          busy={photos.busy}
          error={photos.error}
        />
        {repeating || draft.repeat ? (
          <ThemedText type="small" themeColor="textSecondary">
            Pictures show on every occurrence.
          </ThemedText>
        ) : null}
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

      {existing ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => (repeating ? setDialog('delete') : remove('all'))}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
          <ThemedText themeColor="danger">Delete event</ThemedText>
        </Pressable>
      ) : null}

      <ChoiceDialog
        visible={dialog === 'save'}
        title="This is a repeating event. Save changes for:"
        choices={saveChoices}
        onChoose={save}
        onCancel={() => setDialog(null)}
      />
      <ChoiceDialog
        visible={dialog === 'delete'}
        title="This is a repeating event."
        choices={deleteChoices}
        onChoose={remove}
        onCancel={() => setDialog(null)}
      />
    </EditorLayout>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
