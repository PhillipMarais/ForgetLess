import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ChoiceDialog, ConfirmDialog } from "@/components/choice-dialog";
import { CoverThumb } from "@/components/cover-thumb";
import { Icon, Icons } from "@/components/icon";
import { IconButton } from "@/components/icon-button";
import { ExpandButton, ItemDetails } from "@/components/item-details";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  cancelOccurrence,
  deleteEvent,
  type EventOccurrence,
} from "@/db/events";
import { useTheme } from "@/hooks/use-theme";
import { addDays, formatTime } from "@/lib/dates";

/** "All day", "09:00 – 10:00", or for events spanning days, how they relate to `day`. */
export function timeLabel(occurrence: EventOccurrence, day?: number) {
  if (occurrence.allDay) return "All day";
  const startsBefore = day !== undefined && occurrence.startAt < day;
  const endsAfter = day !== undefined && occurrence.endAt > addDays(day, 1);
  if (startsBefore && endsAfter) return "All day";
  if (startsBefore) return `Until ${formatTime(occurrence.endAt)}`;
  if (endsAfter) return `From ${formatTime(occurrence.startAt)}`;
  return `${formatTime(occurrence.startAt)} – ${formatTime(occurrence.endAt)}`;
}

export function openEvent(occurrence: EventOccurrence) {
  router.push({
    pathname: "/event/[id]",
    params: {
      id: occurrence.eventId,
      occurrence: String(occurrence.originalStart),
    },
  });
}

type EventRowProps = {
  occurrence: EventOccurrence;
  /** Start of the day being shown, to label events that span several days. */
  day?: number;
  /** Calendar rows: title and time, with a button that shows the notes and pictures. */
  compact?: boolean;
};

export function EventRow({ occurrence, day, compact = false }: EventRowProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    compact && (occurrence.notes?.trim() || occurrence.attachmentCount > 0);
  const time = timeLabel(occurrence, day);
  const repeating = occurrence.rrule !== null;

  const remove = (scope: "one" | "all") => {
    setConfirming(false);
    if (scope === "one")
      cancelOccurrence(db, occurrence.eventId, occurrence.originalStart);
    else deleteEvent(db, occurrence.eventId);
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${occurrence.title}, ${time}`}
          onPress={() => openEvent(occurrence)}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        >
          <View style={[styles.bar, { backgroundColor: theme.accent }]} />
          <View style={styles.text}>
            <ThemedText numberOfLines={1}>{occurrence.title}</ThemedText>
            <View style={styles.meta}>
              <ThemedText type="small" themeColor="textSecondary">
                {time}
              </ThemedText>
              {repeating ? (
                <Icon name={Icons.repeat} size={14} color="textSecondary" />
              ) : null}
            </View>
          </View>
          {occurrence.coverUri && !compact ? (
            <CoverThumb
              uri={occurrence.coverUri}
              count={occurrence.attachmentCount}
            />
          ) : null}
        </Pressable>
        {hasDetails ? (
          <ExpandButton
            expanded={expanded}
            onPress={() => setExpanded((value) => !value)}
            label={`notes and pictures for ${occurrence.title}`}
          />
        ) : null}
        <IconButton
          icon={Icons.delete}
          label={`Delete ${occurrence.title}`}
          color="textSecondary"
          onPress={() => setConfirming(true)}
        />
      </View>
      {expanded ? (
        <View style={styles.details}>
          <ItemDetails
            ownerType="event"
            ownerId={occurrence.eventId}
            notes={occurrence.notes}
          />
        </View>
      ) : null}
      {confirming && repeating ? (
        <ChoiceDialog
          visible
          title={`“${occurrence.title}” repeats.`}
          choices={[
            {
              label: "Delete this event",
              value: "one" as const,
              destructive: true,
            },
            {
              label: "Delete all events",
              value: "all" as const,
              destructive: true,
            },
          ]}
          onChoose={remove}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
      {confirming && !repeating ? (
        <ConfirmDialog
          visible
          title={`Delete “${occurrence.title}”?`}
          confirmLabel="Delete event"
          onConfirm={() => remove("all")}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  details: {
    paddingLeft: Spacing.three * 2 + 4,
    paddingRight: Spacing.three,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    minHeight: 48,
  },
  pressed: {
    opacity: 0.6,
  },
  bar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
  },
  text: {
    flex: 1,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
});
