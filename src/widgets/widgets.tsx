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
  tasks: 'forgetless:///tasks',
  notes: 'forgetless:///notes',
  newTask: 'forgetless:///task/new',
  newNote: 'forgetless:///note/new',
  voiceNote: 'forgetless:///note/new?voice=1&from=widget',
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
                borderRadius: 12,
                padding: 10,
                marginBottom: 6,
              }}>
              <TextWidget
                text={note.title.trim() || 'Untitled'}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 14, fontFamily: WidgetFonts.bodyBold, color: colors.text }}
              />
              {note.body.trim() ? (
                <TextWidget
                  text={note.body.trim().split('\n')[0]}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 12, fontFamily: WidgetFonts.body, color: colors.textSecondary }}
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

export type CalendarData = {
  month: number;
  /** 42 day starts, Monday first. */
  days: number[];
  eventDays: Set<number>;
  taskDays: Set<number>;
};

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
  // Inside the frame's padding; header ~42dp, weekday row ~18dp.
  const cell = Math.max(20, Math.floor(Math.min((width - 26) / 7, (height - 26 - 42 - 18) / 6)));
  const circle = Math.min(cell - 4, 30);
  const weeks = Array.from({ length: 6 }, (_, week) => data.days.slice(week * 7, week * 7 + 7));

  return (
    <Frame colors={colors} link={AppLinks.calendar}>
      <Header
        colors={colors}
        accentTitle={month.toLocaleDateString(undefined, { month: 'long' })}
        title={String(month.getFullYear())}
      />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row' }}>
        {weekdayLabels().map((label) => (
          <FlexWidget key={label} style={{ flex: 1, alignItems: 'center' }}>
            <TextWidget text={label.slice(0, 2)} style={{ fontSize: 11, fontFamily: WidgetFonts.body, color: colors.textSecondary }} />
          </FlexWidget>
        ))}
      </FlexWidget>
      {weeks.map((week) => (
        <FlexWidget key={week[0]} style={{ width: 'match_parent', flexDirection: 'row', height: cell }}>
          {week.map((day) => {
            const date = new Date(day);
            const isToday = day === today;
            const inMonth = date.getMonth() === month.getMonth();
            const dots: HexColor[] = [];
            if (data.eventDays.has(day)) dots.push(colors.accent);
            if (data.taskDays.has(day)) dots.push(colors.text);
            return (
              <FlexWidget
                key={day}
                style={{ flex: 1, height: cell, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <FlexWidget
                  style={{
                    width: circle,
                    height: circle,
                    borderRadius: circle / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday ? colors.accent : '#00000000',
                  }}>
                  <TextWidget
                    text={String(date.getDate())}
                    style={{
                      fontSize: Math.min(14, Math.round(circle * 0.45)),
                      fontFamily: isToday ? WidgetFonts.bodyBold : WidgetFonts.body,
                      color: isToday ? colors.onAccent : inMonth ? colors.text : colors.textSecondary,
                    }}
                  />
                </FlexWidget>
                <FlexWidget style={{ flexDirection: 'row', height: 4 }}>
                  {dots.map((color, index) => (
                    <FlexWidget
                      key={color + index}
                      style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginHorizontal: 1 }}
                    />
                  ))}
                </FlexWidget>
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ))}
    </Frame>
  );
}

// --- Voice note ----------------------------------------------------------------------------

export function VoiceNoteWidget({ colors }: { colors: WidgetColors }) {
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
      <SvgWidget svg={WidgetIcons.mic(colors.onAccent)} style={{ width: 26, height: 26, marginRight: 8 }} />
      <TextWidget
        text="Voice note"
        maxLines={1}
        style={{ fontSize: 16, fontFamily: WidgetFonts.display, color: colors.onAccent }}
      />
    </FlexWidget>
  );
}
