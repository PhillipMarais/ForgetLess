import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ConfirmDialog } from '@/components/choice-dialog';
import { CoverThumb } from '@/components/cover-thumb';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ExpandButton, ItemDetails } from '@/components/item-details';
import { SwipeToDismiss } from '@/components/swipe-to-dismiss';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteTask, toggleStep, toggleTaskEntry, type Task } from '@/db/tasks';
import { useControlSize, useTheme } from '@/hooks/use-theme';
import { daysFromToday, formatDueLabel } from '@/lib/dates';

type TaskRowProps = {
  task: Task;
  /**
   * Given on Today: a ticked-off task can be swiped right to clear it from the list.
   * Elsewhere done tasks just stay struck through.
   */
  onDismiss?: () => void;
  /** Show the first line of the task's notes under its title (default on). */
  showNotes?: boolean;
  /**
   * Calendar rows: just the title and time, with a button that shows the notes and
   * pictures. Steps start folded away.
   */
  compact?: boolean;
};

export function TaskRow({ task, onDismiss, showNotes = true, compact = false }: TaskRowProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const done = task.completedAt !== null;
  const upcoming = task.occurrence === 'upcoming';
  const overdue = !done && !upcoming && task.dueAt !== null && daysFromToday(task.dueAt) < 0;
  const notes = showNotes && !compact ? task.notes?.trim().split('\n')[0] : undefined;
  const checkSize = useControlSize(24);

  // Steps can be ticked on the task itself, not on a past or future date of a repeating one.
  const steps = task.occurrence === null ? task.steps : [];
  const stepsDone = steps.filter((step) => step.doneAt !== null).length;
  const hasSteps = steps.length > 0;
  // Open tasks show their steps; done ones (and calendar rows) fold them away.
  const [showSteps, setShowSteps] = useState(!done && !compact);
  const [expanded, setExpanded] = useState(false);
  const hasDetails = compact && (task.notes?.trim() || task.attachmentCount > 0);

  const label = hasSteps ? `${task.title}, ${stepsDone} of ${steps.length} steps done` : task.title;

  return (
    <SwipeToDismiss enabled={done && onDismiss !== undefined} onDismiss={() => onDismiss?.()} hint="Clear from Today">
      <View style={[styles.container, { borderBottomColor: theme.border }]}>
        <View style={styles.row}>
          {upcoming ? (
            // A later date of a repeating task: it can be ticked off once it is due.
            <View
              accessibilityLabel="Repeats; can be ticked off once it's due"
              style={[
                styles.checkbox,
                styles.upcoming,
                { width: checkSize, height: checkSize, borderRadius: checkSize / 2, borderColor: theme.border },
              ]}>
              <Icon name={Icons.repeat} size={12} color="textSecondary" />
            </View>
          ) : hasSteps && !done ? (
            // With steps, the task is ticked off by its steps; the circle shows how far along it is.
            <View accessibilityLabel={label}>
              <ProgressRing size={checkSize} progress={stepsDone / steps.length} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={label}
              accessibilityHint={hasSteps ? 'Shows the steps; untick a step to reopen the task' : undefined}
              onPress={() => (hasSteps ? setShowSteps(true) : toggleTaskEntry(db, task))}
              hitSlop={Spacing.two}
              style={[
                styles.checkbox,
                { width: checkSize, height: checkSize, borderRadius: checkSize / 2 },
                { borderColor: done ? theme.accent : theme.textSecondary },
                done && { backgroundColor: theme.accent },
              ]}>
              {done ? <Icon name={Icons.check} size={Math.round(checkSize * 0.66)} color="onAccent" /> : null}
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${task.title}`}
            onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
            style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
            <View style={styles.text}>
              <ThemedText
                themeColor={done || upcoming ? 'textSecondary' : 'text'}
                numberOfLines={compact ? 1 : undefined}
                style={done && styles.struck}>
                {task.title}
              </ThemedText>
              {notes ? (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={done && styles.struck}>
                  {notes}
                </ThemedText>
              ) : null}
              {task.dueAt !== null ? (
                <View style={styles.meta}>
                  <ThemedText type="small" themeColor={overdue ? 'danger' : 'textSecondary'}>
                    {done && task.occurrence === 'done' ? 'Done · ' : ''}
                    {formatDueLabel(task.dueAt, task.dueAllDay)}
                  </ThemedText>
                  {task.rrule ? <Icon name={Icons.repeat} size={14} color="textSecondary" /> : null}
                </View>
              ) : null}
            </View>
            {task.coverUri && !compact ? <CoverThumb uri={task.coverUri} count={task.attachmentCount} /> : null}
          </Pressable>
          {hasDetails ? (
            <ExpandButton
              expanded={expanded}
              onPress={() => setExpanded((value) => !value)}
              label={`notes and pictures for ${task.title}`}
            />
          ) : null}
          {task.occurrence === null ? (
            <IconButton
              icon={Icons.delete}
              label={`Delete ${task.title}`}
              color="textSecondary"
              onPress={() => setConfirming(true)}
            />
          ) : null}
        </View>

        {hasSteps ? (
          <View style={[styles.below, { paddingLeft: Spacing.three * 2 + checkSize }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showSteps }}
              accessibilityLabel={`${showSteps ? 'Hide' : 'Show'} steps, ${stepsDone} of ${steps.length} done`}
              onPress={() => setShowSteps((value) => !value)}
              style={({ pressed }) => [
                styles.stepsToggle,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <Icon name={Icons.steps} size={14} color={stepsDone === steps.length ? 'accentText' : 'textSecondary'} />
              <ThemedText type="smallBold" themeColor={stepsDone === steps.length ? 'accentText' : 'textSecondary'}>
                {stepsDone}/{steps.length}
              </ThemedText>
              <Icon name={showSteps ? Icons.collapse : Icons.expand} size={16} color="textSecondary" />
            </Pressable>
            {showSteps
              ? steps.map((step) => {
                  const stepDone = step.doneAt !== null;
                  return (
                    <Pressable
                      key={step.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: stepDone }}
                      accessibilityLabel={step.title}
                      onPress={() => toggleStep(db, task, step.id)}
                      style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
                      <View
                        style={[
                          styles.stepBox,
                          { borderColor: stepDone ? theme.accent : theme.textSecondary },
                          stepDone && { backgroundColor: theme.accent },
                        ]}>
                        {stepDone ? <Icon name={Icons.check} size={12} color="onAccent" /> : null}
                      </View>
                      <ThemedText
                        type="small"
                        themeColor={stepDone ? 'textSecondary' : 'text'}
                        style={[styles.flex, stepDone && styles.struck]}>
                        {step.title}
                      </ThemedText>
                    </Pressable>
                  );
                })
              : null}
          </View>
        ) : null}

        {expanded ? (
          <View style={[styles.below, { paddingLeft: Spacing.three * 2 + checkSize }]}>
            <ItemDetails ownerType="task" ownerId={task.id} notes={task.notes} />
          </View>
        ) : null}

        {confirming ? (
          <ConfirmDialog
            visible
            title={`Delete “${task.title}”?`}
            confirmLabel="Delete task"
            onConfirm={() => {
              setConfirming(false);
              deleteTask(db, task.id);
            }}
            onCancel={() => setConfirming(false)}
          />
        ) : null}
      </View>
    </SwipeToDismiss>
  );
}

/** A circle that fills clockwise as `progress` goes from 0 to 1. */
function ProgressRing({ size, progress }: { size: number; progress: number }) {
  const theme = useTheme();
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.textSecondary} strokeWidth={stroke} fill="none" opacity={0.5} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={theme.accent}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference * progress} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
  },
  checkbox: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcoming: {
    borderStyle: 'dashed',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
  },
  text: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  below: {
    paddingRight: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  stepsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
  },
  stepBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
