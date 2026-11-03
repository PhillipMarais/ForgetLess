import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AlarmField } from '@/components/alarm-field';
import { ChipGroup } from '@/components/chip';
import { ChoiceDialog, type Choice } from '@/components/choice-dialog';
import { DateTimeField } from '@/components/date-time-field';
import { ClearTextButton } from '@/components/clear-text-button';
import { EditorLayout, HeaderTextButton, leaveEditor, useClosingHeader } from '@/components/editor';
import { EmptyState } from '@/components/empty-state';
import { FormRow, FormSection, FormSwitch, FormTextInput } from '@/components/form';
import { Icons } from '@/components/icon';
import { PhotoStrip } from '@/components/photo-strip';
import { MonthDayPicker, WeekdayPicker } from '@/components/repeat-pickers';
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
import { getAlarmOffset, setAlarmOffset } from '@/db/reminders';
import { useDraftPhotos } from '@/hooks/use-draft-photos';
import { announceAlarm } from '@/lib/alarm-toast';
import { addDays, nextHour, startOfDay } from '@/lib/dates';
import { resolveEventSchedule, type EventSchedule } from '@/lib/event-schedule';
import {
  buildRRule,
  ordinal,
  REPEAT_OPTIONS,
  repeatDetailsOf,
  repeatFrequencyOf,
  shiftWallClock,
} from '@/lib/recurrence';
import { mondayIndex } from '@/lib/task-schedule';

const HOUR = 60 * 60 * 1000;

/**
 * What the form edits. For all-day events `endAt` is the last day (inclusive);
 * the database stores the midnight after it.
 */
type Draft = EventSchedule & {
  title: string;
  notes: string;
  /** Minutes before the start; null for no alarm. All-day events have none. */
  alarm: number | null;
};

type Existing = {
  event: CalendarEvent;
  occurrence: EventOccurrence;
  attachments: Attachment[];
  alarm: number | null;
};

type Scope = 'one' | 'all';

/** 09:00 on the day containing `time`: the default start for events on other days. */
function at9(time: number) {
  return new Date(time).setHours(9, 0, 0, 0);
}

/**
 * Defaults for a new event: an exact `start` (e.g. a tapped hour on the timeline), else
 * 09:00 on a chosen `day`, else the next whole hour today.
 */
function newDraft(day: number | undefined, start: number | undefined): Draft {
  const today = startOfDay();
  const startAt =
    start !== undefined ? start : day === undefined || day === today ? nextHour() : at9(day);
  return {
    title: '',
    notes: '',
    allDay: false,
    startAt,
    endAt: startAt + HOUR,
    repeat: null,
    weekdays: [mondayIndex(startAt)],
    monthDay: new Date(startAt).getDate(),
    alarm: null,
  };
}

function draftFrom({ event, occurrence, alarm }: Existing): Draft {
  const details = repeatDetailsOf(event.rrule);
  return {
    weekdays: details.weekdays?.length ? [...details.weekdays] : [mondayIndex(occurrence.startAt)],
    monthDay: details.monthDay ?? new Date(occurrence.startAt).getDate(),
    title: occurrence.title,
    notes: occurrence.notes ?? '',
    allDay: occurrence.allDay,
    startAt: occurrence.startAt,
    endAt: occurrence.allDay ? addDays(occurrence.endAt, -1) : occurrence.endAt,
    repeat: repeatFrequencyOf(event.rrule),
    alarm,
  };
}

const ruleOf = (draft: Draft) =>
  buildRRule(draft.repeat, { weekdays: draft.weekdays, monthDay: draft.monthDay });

/** `snap`: move a new or re-ruled repeating event to its first matching day. */
function toInput(draft: Draft, snap: boolean): EventInput {
  const { rrule, startAt, endAt } = resolveEventSchedule(draft, snap);
  return {
    title: draft.title,
    notes: draft.notes.trim() || null,
    allDay: draft.allDay,
    startAt: draft.allDay ? startOfDay(startAt) : startAt,
    endAt: draft.allDay ? addDays(startOfDay(endAt), 1) : endAt,
    rrule,
  };
}

export default function EventScreen() {
  const params = useLocalSearchParams<{
    id: string;
    occurrence?: string;
    date?: string;
    start?: string;
  }>();
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
      const alarm = event ? await getAlarmOffset(db, 'event', event.id) : null;
      if (active) setExisting(event && occurrence ? { event, occurrence, attachments, alarm } : null);
    })();
    return () => {
      active = false;
    };
  }, [db, isNew, params.id, params.occurrence]);

  if (isNew) {
    const day = params.date ? Number(params.date) : undefined;
    const start = params.start ? Number(params.start) : undefined;
    return <EventEditor initial={newDraft(day, start)} />;
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
  const ruleChanged = ruleOf(draft) !== ruleOf(initial);
  // A repeating event's end is a time on its start day (or the next morning).
  const endsBeforeStart = draft.repeat === null && draft.endAt < draft.startAt;
  const valid = draft.title.trim().length > 0 && !endsBeforeStart && !saving && !photos.busy;
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
    header.freeze();
    setDialog(null);
    setSaving(true);
    const input = toInput(draft, !existing || ruleChanged);
    const eventId = existing ? await saveExisting(existing, input, scope) : await createEvent(db, input);
    // Pictures and the alarm belong to the whole event, whichever scope was chosen.
    await photos.save(db, 'event', eventId);
    const alarmOffset = draft.allDay ? null : draft.alarm;
    await setAlarmOffset(db, 'event', eventId, alarmOffset);
    if (alarmOffset !== null) await announceAlarm(db, 'event', eventId);
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
    header.freeze();
    if (repeating && scope === 'one') {
      await cancelOccurrence(db, existing.event.id, existing.occurrence.originalStart);
    } else {
      await deleteEvent(db, existing.event.id);
    }
    leaveEditor('/calendar');
  };

  const header = useClosingHeader({
    title: existing ? 'Edit event' : 'New event',
    headerRight: () => <HeaderTextButton label="Save" onPress={onSavePress} disabled={!valid} />,
  });

  function onSavePress() {
    // Changing the repeat rule or all-day only makes sense for the whole series.
    const seriesOnly = ruleChanged || draft.allDay !== initial.allDay;
    if (repeating && !seriesOnly) setDialog('save');
    else save('all');
  }

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
      <Stack.Screen options={header.options} />
      <FormTextInput
        value={draft.title}
        onChangeText={(title) => update({ title })}
        placeholder="Title"
        accessibilityLabel="Title"
        autoFocus={!existing}
        variant="title"
      />

      <FormSection label="Repeat">
        <ChipGroup
          label="Repeat"
          options={REPEAT_OPTIONS}
          value={draft.repeat}
          onChange={(repeat) => update({ repeat })}
        />
      </FormSection>

      <FormSection label={whenLabel(draft)}>
        {draft.repeat === 'weekly' ? (
          <WeekdayPicker value={draft.weekdays} onChange={(weekdays) => update({ weekdays })} />
        ) : null}
        {draft.repeat === 'monthly' ? (
          <>
            <MonthDayPicker value={draft.monthDay} onChange={(monthDay) => update({ monthDay })} />
            {draft.monthDay > 28 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Months without a {ordinal(draft.monthDay)} are skipped.
              </ThemedText>
            ) : null}
          </>
        ) : null}
        <FormSwitch label="All day" value={draft.allDay} onChange={changeAllDay} />
        <FormRow label={startLabel(draft)}>
          <DateTimeField mode="date" label="Start date" value={draft.startAt} onChange={changeStart} />
          {!draft.allDay ? (
            <DateTimeField mode="time" label="Start time" value={draft.startAt} onChange={changeStart} />
          ) : null}
        </FormRow>
        {draft.repeat === null ? (
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
        ) : !draft.allDay ? (
          <FormRow label="Until">
            <DateTimeField mode="time" label="End time" value={draft.endAt} onChange={(endAt) => update({ endAt })} />
          </FormRow>
        ) : null}
        {!draft.allDay ? (
          <AlarmField value={draft.alarm} onChange={(alarm) => update({ alarm })} />
        ) : null}
        {endsBeforeStart ? (
          <ThemedText type="small" themeColor="danger">
            The end is before the start.
          </ThemedText>
        ) : null}
      </FormSection>

      <FormSection label="Pictures">
        <PhotoStrip draft={photos} />
        {repeating || draft.repeat ? (
          <ThemedText type="small" themeColor="textSecondary">
            Pictures show on every occurrence.
          </ThemedText>
        ) : null}
      </FormSection>

      <FormSection
        label="Notes"
        action={<ClearTextButton text={draft.notes} onChange={(notes) => update({ notes })} />}>
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

function whenLabel({ repeat }: Draft) {
  if (repeat === 'weekly') return 'On these days';
  if (repeat === 'monthly') return 'On this day of the month';
  return 'When';
}

/** Weekly and monthly events start on the first chosen day from this date. */
function startLabel({ repeat }: Draft) {
  if (repeat === 'weekly' || repeat === 'monthly') return 'From';
  if (repeat === 'yearly') return 'Every year on';
  if (repeat === 'daily') return 'Starting';
  return 'Starts';
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
