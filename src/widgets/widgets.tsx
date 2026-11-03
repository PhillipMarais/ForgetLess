// Widgets are drawn by react-native-android-widget, which calls these as plain functions:
// keep the React Compiler (and its hooks) out of this file.
'use no memo';

import {
  FlexWidget,
  ListWidget,
  SvgWidget,
  TextWidget,
  type HexColor,
} from 'react-native-android-widget';

import type { EventOccurrence } from '@/db/events';
import type { Note } from '@/db/notes';
import type { Task } from '@/db/tasks';
import { formatDueLabel, formatTime, startOfDay, weekdayLabels } from '@/lib/dates';

import { logoSvg, WidgetFonts, WidgetIcons, type WidgetColors } from './widget-theme';

/** Links into the app (scheme "forgetless", see app.json). */
export const AppLinks = {
  today: 'forgetless:///',
  calendar: 'forgetless:///calendar',
  calendarDay: (day: number) => `forgetless:///calendar?day=${day}`,
  newEvent: 'forgetless:///event/new',
  tasks: 'forgetless:///tasks',
  notes: 'forgetless:///notes',
  // Quick-add popups over the home screen (QuickAddActivity in modules/forgetless-device).
  newTask: 'forgetless-quick://task',
  newNote: 'forgetless-quick://note',
  voiceNote: 'forgetless-quick://voice',
  task: (id: string) => `forgetless:///task/${id}`,
  note: (id: string) => `forgetless:///note/${id}`,
  event: (occurrence: EventOccurrence) =>
    `forgetless:///event/${occurrence.eventId}?occurrence=${occurrence.originalStart}`,
};

const open = (uri: string) => ({ clickAction: 'OPEN_URI', clickActionData: { uri } }) as const;

/** The data a task checkbox sends back when tapped (see task-handler). */
export type ToggleTaskData = { id: string; occurrence: Task['occurrence']; dueAt: number | null; done: boolean };

const RADIUS = 24;

function Frame({ colors, link, children }: { colors: WidgetColors; link: string; children: unknown }) {
  return (
    <FlexWidget
      {...open(link)}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: colors.background,
        borderRadius: RADIUS,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
      }}>
      {children}
    </FlexWidget>
  );
}

/** Logo and title on the left; round buttons (e.g. +) on the right. */
function Header({
  colors,
  title,
  accentTitle,
  buttons = [],
}: {
  colors: WidgetColors;
  title: string;
  /** Drawn before the title in the accent colour, e.g. the weekday. */
  accentTitle?: string;
  buttons?: { icon: string; link: string; label: string; filled?: boolean }[];
}) {
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <SvgWidget svg={logoSvg(colors)} style={{ width: 31, height: 15, marginRight: 8 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {accentTitle ? (
          <TextWidget
            text={`${accentTitle} `}
            maxLines={1}
            style={{ fontSize: 17, fontFamily: WidgetFonts.display, color: colors.accentText }}
          />
        ) : null}
        <TextWidget
          text={title}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 17, fontFamily: WidgetFonts.display, color: colors.text }}
        />
      </FlexWidget>
      {buttons.map((button) => (
        <FlexWidget
          key={button.link}
          {...open(button.link)}
          accessibilityLabel={button.label}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            marginLeft: 6,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: button.filled ? colors.accent : colors.surface,
          }}>
          <SvgWidget svg={button.icon} style={{ width: 20, height: 20 }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

function Empty({ colors, text }: { colors: WidgetColors; text: string }) {
  return (
    <FlexWidget style={{ flex: 1, width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
      <TextWidget text={text} style={{ fontSize: 14, fontFamily: WidgetFonts.body, color: colors.textSecondary }} />
    </FlexWidget>
  );
}

function SectionLabel({ colors, text, danger }: { colors: WidgetColors; text: string; danger?: boolean }) {
  return (
    <FlexWidget style={{ width: 'match_parent', paddingTop: 6, paddingBottom: 2 }}>
      <TextWidget
        text={text.toUpperCase()}
        style={{
          fontSize: 11,
          letterSpacing: 0.1,
          fontFamily: WidgetFonts.bodyBold,
          color: danger ? colors.danger : colors.accentText,
        }}
      />
    </FlexWidget>
  );
}

function EventLine({ colors, occurrence }: { colors: WidgetColors; occurrence: EventOccurrence }) {
  return (
    <FlexWidget
      {...open(AppLinks.event(occurrence))}
      style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
      <FlexWidget style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: colors.accent, marginRight: 10 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={occurrence.title}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 14, fontFamily: WidgetFonts.bodyBold, color: colors.text }}
        />
        <TextWidget
          text={occurrence.allDay ? 'All day' : `${formatTime(occurrence.startAt)} – ${formatTime(occurrence.endAt)}`}
          style={{ fontSize: 12, fontFamily: WidgetFonts.body, color: colors.textSecondary }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function TaskLine({ colors, task, showDue }: { colors: WidgetColors; task: Task; showDue: boolean }) {
  const done = task.completedAt !== null;
  const steps = task.occurrence === null ? task.steps : [];
  const stepsDone = steps.filter((step) => step.doneAt !== null).length;
  // Tasks with steps are ticked off step by step, in the app.
  const toggle: ToggleTaskData = { id: task.id, occurrence: task.occurrence, dueAt: task.dueAt, done };
  const box =
    steps.length > 0 && !done
      ? { svg: WidgetIcons.steps(colors.accent), action: open(AppLinks.task(task.id)) }
      : {
          svg: done ? WidgetIcons.checked(colors.accent, colors.onAccent) : WidgetIcons.circle(colors.textSecondary),
          action: { clickAction: 'TOGGLE_TASK', clickActionData: toggle },
        };
  const overdue = !done && task.dueAt !== null && task.dueAt < startOfDay();
  const meta = [
    showDue && task.dueAt !== null ? formatDueLabel(task.dueAt, task.dueAllDay) : null,
    steps.length > 0 ? `${stepsDone}/${steps.length} steps` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <FlexWidget
        {...box.action}
        accessibilityLabel={done ? `Untick ${task.title}` : `Tick off ${task.title}`}
        style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
        <SvgWidget svg={box.svg} style={{ width: 22, height: 22 }} />
      </FlexWidget>
      <FlexWidget {...open(AppLinks.task(task.id))} style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={task.title}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 14,
            fontFamily: WidgetFonts.body,
            color: done ? colors.textSecondary : colors.text,
          }}
        />
        {meta ? (
          <TextWidget
            text={meta}
            style={{
              fontSize: 12,
              fontFamily: WidgetFonts.body,
              color: overdue ? colors.danger : colors.textSecondary,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}

// --- Today ---------------------------------------------------------------------------------

export type TodayData = { day: number; events: EventOccurrence[]; tasks: Task[] };

export function TodayWidget({ colors, data }: { colors: WidgetColors; data: TodayData }) {
  const date = new Date(data.day);
  const overdue = data.tasks.filter((task) => task.dueAt! < data.day);
  const dueToday = data.tasks.filter((task) => task.dueAt! >= data.day);
  const empty = data.events.length === 0 && data.tasks.length === 0;
  return (
    <Frame colors={colors} link={AppLinks.today}>
      <Header
        colors={colors}
        accentTitle={date.toLocaleDateString(undefined, { weekday: 'long' })}
        title={date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        buttons={[{ icon: WidgetIcons.add(colors.onAccent), link: AppLinks.newTask, label: 'Add task', filled: true }]}
      />
      {empty ? (
        <Empty colors={colors} text="Nothing on today" />
      ) : (
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {data.events.length > 0 ? <SectionLabel colors={colors} text="Schedule" /> : null}
          {data.events.map((occurrence) => (
            <EventLine key={`${occurrence.eventId}:${occurrence.originalStart}`} colors={colors} occurrence={occurrence} />
          ))}
          {overdue.length > 0 ? <SectionLabel colors={colors} text="Overdue" danger /> : null}
          {overdue.map((task) => (
            <TaskLine key={`${task.id}:${task.dueAt}`} colors={colors} task={task} showDue />
          ))}
          {dueToday.length > 0 ? <SectionLabel colors={colors} text="Tasks" /> : null}
          {dueToday.map((task) => (
            <TaskLine key={`${task.id}:${task.dueAt}`} colors={colors} task={task} showDue={!task.dueAllDay} />
          ))}
        </ListWidget>
      )}
    </Frame>
  );
}

// --- Tasks ---------------------------------------------------------------------------------

export function TasksWidget({ colors, tasks }: { colors: WidgetColors; tasks: Task[] }) {
  const openTasks = tasks.filter((task) => task.completedAt === null);
  return (
    <Frame colors={colors} link={AppLinks.tasks}>
      <Header
        colors={colors}
        title="Tasks"
        buttons={[{ icon: WidgetIcons.add(colors.onAccent), link: AppLinks.newTask, label: 'Add task', filled: true }]}
      />
      {openTasks.length === 0 ? (
        <Empty colors={colors} text="All done" />
      ) : (
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {openTasks.slice(0, 40).map((task) => (
            <TaskLine key={task.id} colors={colors} task={task} showDue />
          ))}
        </ListWidget>
      )}
    </Frame>
  );
}

// --- Notes ---------------------------------------------------------------------------------

export function NotesWidget({ colors, notes }: { colors: WidgetColors; notes: Note[] }) {
  return (
    <Frame colors={colors} link={AppLinks.notes}>
      <Header
        colors={colors}
        title="Notes"
        buttons={[
          { icon: WidgetIcons.mic(colors.accentText), link: AppLinks.voiceNote, label: 'Speak a note' },
          { icon: WidgetIcons.add(colors.onAccent), link: AppLinks.newNote, label: 'New note', filled: true },
        ]}
      />
      {notes.length === 0 ? (
        <Empty colors={colors} text="No notes yet" />
      ) : (
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {notes.slice(0, 30).map((note) => (
            <FlexWidget
              key={note.id}
              {...open(AppLinks.note(note.id))}
              style={{
                width: 'match_parent',
                flexDirection: 'column',
                backgroundColor: colors.surface,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 10,
              }}>
              <TextWidget
                text={note.title.trim() || 'Untitled'}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 15, fontFamily: WidgetFonts.bodyBold, color: colors.text }}
              />
              {note.body.trim() ? (
                <TextWidget
                  text={note.body.trim().split('\n')[0]}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 13, fontFamily: WidgetFonts.body, color: colors.textSecondary, marginTop: 4 }}
                />
              ) : null}
            </FlexWidget>
          ))}
        </ListWidget>
      )}
    </Frame>
  );
}

// --- Calendar ------------------------------------------------------------------------------

/** One line in a day of the calendar widget. */
export type CalendarItem = { title: string; kind: 'holiday' | 'event' | 'task'; done?: boolean };

export type CalendarData = {
  month: number;
  /** Months from this one: what the arrows have paged to. */
  offset: number;
  /** The weeks shown (Monday first): 4 to 6 rows of 7 day starts. */
  weeks: number[][];
  /** Each day's holidays, events and tasks, in that order. */
  items: Map<number, CalendarItem[]>;
};

/** The data the month arrows send back (see task-handler). */
export type CalendarMonthData = { offset: number };

const ITEM_LINE = 15;
const DAY_NUMBER = 20;

/**
 * Like a wall calendar: each day lists what's on it (holidays, events, then tasks), as much
 * as fits. Arrows page through months; tapping a day opens it in the app.
 */
export function CalendarWidget({
  colors,
  data,
  width,
  height,
}: {
  colors: WidgetColors;
  data: CalendarData;
  width: number;
  height: number;
}) {
  const today = startOfDay();
  const month = new Date(data.month);
  // Inside the frame's padding (12 + 1 border each side); header ~42dp, weekday row 18dp.
  const rowHeight = Math.max(22, Math.floor((height - 26 - 42 - 18) / data.weeks.length));
  // Fixed widths: with flex, long names pushed the columns out of line.
  const cellWidth = Math.floor((width - 26) / 7);
  const lines = Math.max(0, Math.floor((rowHeight - DAY_NUMBER - 2) / ITEM_LINE));
  const fontSize = cellWidth < 44 ? 9 : 10;

  const toMonth = (offset: number) => ({
    clickAction: 'CALENDAR_MONTH',
    clickActionData: { offset } satisfies CalendarMonthData,
  });

  return (
    <Frame colors={colors} link={AppLinks.calendar}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <SvgWidget svg={logoSvg(colors)} style={{ width: 31, height: 15, marginRight: 8 }} />
        {/* Paged away, the month's name leads back to this month. */}
        <FlexWidget
          {...(data.offset !== 0 ? toMonth(0) : open(AppLinks.calendar))}
          accessibilityLabel={data.offset !== 0 ? 'Back to this month' : 'Open the calendar'}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 34 }}>
          <TextWidget
            text={`${month.toLocaleDateString(undefined, { month: 'long' })} `}
            maxLines={1}
            style={{ fontSize: 17, fontFamily: WidgetFonts.display, color: colors.accentText }}
          />
          <TextWidget
            text={String(month.getFullYear())}
            maxLines={1}
            style={{ fontSize: 17, fontFamily: WidgetFonts.display, color: colors.text }}
          />
        </FlexWidget>
        <RoundButton
          colors={colors}
          label="Previous month"
          action={toMonth(data.offset - 1)}
          svg={WidgetIcons.previous(colors.text)}
        />
        <RoundButton
          colors={colors}
          label="Next month"
          action={toMonth(data.offset + 1)}
          svg={WidgetIcons.next(colors.text)}
        />
        <RoundButton
          colors={colors}
          label="New event"
          action={open(AppLinks.newEvent)}
          svg={WidgetIcons.add(colors.onAccent)}
          filled
        />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', height: 18 }}>
        {weekdayLabels().map((label) => (
          <FlexWidget key={label} style={{ width: cellWidth, alignItems: 'center' }}>
            <TextWidget
              text={label.slice(0, 2)}
              style={{ fontSize: 11, fontFamily: WidgetFonts.body, color: colors.textSecondary }}
            />
          </FlexWidget>
        ))}
      </FlexWidget>
      {data.weeks.map((week) => (
        <FlexWidget
          key={week[0]}
          style={{
            width: 'match_parent',
            height: rowHeight,
            flexDirection: 'row',
            borderTopWidth: 1,
            borderColor: colors.border,
          }}>
          {week.map((day) => {
            const date = new Date(day);
            const isToday = day === today;
            const inMonth = date.getMonth() === month.getMonth();
            const items = data.items.get(day) ?? [];
            const holiday = items.some((item) => item.kind === 'holiday');
            const shown = items.slice(0, lines);
            // What doesn't fit is counted next to the date ("3 +2").
            const hidden = items.length - shown.length;
            return (
              <FlexWidget
                key={day}
                {...open(AppLinks.calendarDay(day))}
                accessibilityLabel={date.toDateString()}
                style={{ width: cellWidth, height: rowHeight, flexDirection: 'column', paddingTop: 2, paddingHorizontal: 1 }}>
                <FlexWidget
                  style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <FlexWidget
                  style={{
                    height: 18,
                    borderRadius: 6,
                    paddingHorizontal: 4,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? colors.accent : '#00000000',
                  }}>
                  <TextWidget
                    text={String(date.getDate())}
                    style={{
                      fontSize: 12,
                      fontFamily: isToday ? WidgetFonts.bodyBold : WidgetFonts.body,
                      color: isToday
                        ? colors.onAccent
                        : !inMonth
                          ? colors.textSecondary
                          : holiday
                            ? colors.danger
                            : colors.text,
                    }}
                  />
                </FlexWidget>
                {hidden > 0 ? (
                  <TextWidget
                    text={`+${hidden}`}
                    style={{ fontSize, fontFamily: WidgetFonts.bodyBold, color: colors.textSecondary, marginLeft: 1 }}
                  />
                ) : null}
                </FlexWidget>
                {shown.map((item, index) => (
                  <DayItem key={index} colors={colors} item={item} fontSize={fontSize} faded={!inMonth} />
                ))}
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ))}
    </Frame>
  );
}

function RoundButton({
  colors,
  label,
  action,
  svg,
  filled,
}: {
  colors: WidgetColors;
  label: string;
  action: object;
  svg: string;
  filled?: boolean;
}) {
  return (
    <FlexWidget
      {...action}
      accessibilityLabel={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        marginLeft: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? colors.accent : colors.surface,
      }}>
      <SvgWidget svg={svg} style={{ width: 20, height: 20 }} />
    </FlexWidget>
  );
}

/** A day's line: a tinted label for holidays and events, plain text for tasks. */
function DayItem({
  colors,
  item,
  fontSize,
  faded,
}: {
  colors: WidgetColors;
  item: CalendarItem;
  fontSize: number;
  faded: boolean;
}) {
  const tint = item.kind === 'holiday' ? colors.danger : item.kind === 'event' ? colors.accent : null;
  const textColor =
    faded || item.done ? colors.textSecondary : item.kind === 'holiday' ? colors.danger : colors.text;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: ITEM_LINE - 1,
        marginTop: 1,
        paddingHorizontal: 2,
        borderRadius: 3,
        justifyContent: 'center',
        // The colour at 20% strength behind the text.
        backgroundColor: tint ? (`${tint.slice(0, 7)}33` as HexColor) : '#00000000',
      }}>
      <TextWidget
        text={item.kind === 'task' ? `${item.done ? '✓' : '•'} ${item.title}` : item.title}
        maxLines={1}
        style={{ fontSize, fontFamily: WidgetFonts.body, color: textColor }}
      />
    </FlexWidget>
  );
}

// --- Voice note ----------------------------------------------------------------------------

export function VoiceNoteWidget({ colors, width }: { colors: WidgetColors; width: number }) {
  // Shrunk to one cell, it is just the microphone.
  const iconOnly = width < 120;
  return (
    <FlexWidget
      {...open(AppLinks.voiceNote)}
      accessibilityLabel="Speak a note"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        borderRadius: RADIUS,
        paddingHorizontal: 12,
      }}>
      <SvgWidget
        svg={WidgetIcons.mic(colors.onAccent)}
        style={{ width: 26, height: 26, marginRight: iconOnly ? 0 : 8 }}
      />
      {iconOnly ? null : (
        <TextWidget
          text="Voice note"
          maxLines={1}
          style={{ fontSize: 16, fontFamily: WidgetFonts.display, color: colors.onAccent }}
        />
      )}
    </FlexWidget>
  );
}
