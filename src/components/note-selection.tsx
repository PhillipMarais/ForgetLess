import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { ChoiceDialog, ConfirmDialog } from '@/components/choice-dialog';
import { Icon, Icons, type IconName } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/db/categories';
import { deleteNotes, setNotesCategory, setNotesPinned, setNotesVoice, type Note } from '@/db/notes';
import { useTheme } from '@/hooks/use-theme';
import { shareNotes } from '@/lib/share-notes';

/** Multi-select state for a notes list. Android back clears the selection. */
export function useNoteSelection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const selecting = selected.size > 0;

  useEffect(() => {
    if (!selecting) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(new Set());
      return true;
    });
    return () => subscription.remove();
  }, [selecting]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return { selected, selecting, toggle, clear: () => setSelected(new Set()) };
}

export type NoteSelection = ReturnType<typeof useNoteSelection>;

type SelectionBarProps = {
  selection: NoteSelection;
  /** The notes on screen, to tell whether the selected ones are all pinned. */
  notes: readonly Note[];
  /** Categories to offer under Move. */
  categories: readonly Category[];
  /** The category being looked at, left out of Move's choices. */
  currentCategoryId?: string;
};

/**
 * "N selected", then labelled actions: Pin, Move (into, between or out of categories),
 * Share, Delete, and "Make note" for voice notes.
 */
export function SelectionBar({ selection, notes, categories, currentCategoryId }: SelectionBarProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [dialog, setDialog] = useState<'move' | 'delete' | null>(null);
  const ids = [...selection.selected];
  const chosen = notes.filter((note) => selection.selected.has(note.id));
  const allPinned = chosen.length > 0 && chosen.every((note) => note.pinned);
  const voiceIds = chosen.filter((note) => note.voice).map((note) => note.id);
  const anyInCategory = chosen.some((note) => note.categoryId !== null);
  const count = selection.selected.size;
  const noun = count === 1 ? 'note' : 'notes';

  const run = async (action: () => Promise<void>) => {
    setDialog(null);
    await action();
    selection.clear();
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.top}>
        <ThemedText type="defaultBold" style={styles.count} accessibilityLiveRegion="polite">
          {count} selected
        </ThemedText>
        <IconButton icon={Icons.close} label="Done selecting" onPress={selection.clear} />
      </View>
      <View style={styles.actions}>
        <Action
          icon={Icons.pin}
          label={allPinned ? 'Unpin' : 'Pin'}
          active={allPinned}
          onPress={() => run(() => setNotesPinned(db, ids, !allPinned))}
        />
        <Action icon={Icons.moveToCategory} label="Move" onPress={() => setDialog('move')} />
        <Action icon={Icons.share} label="Share" onPress={() => run(() => shareNotes(chosen))} />
        {voiceIds.length > 0 ? (
          <Action icon={Icons.toNote} label="Make note" onPress={() => run(() => setNotesVoice(db, voiceIds, false))} />
        ) : null}
        <Action icon={Icons.delete} label="Delete" danger onPress={() => setDialog('delete')} />
      </View>

      <ChoiceDialog
        visible={dialog === 'move'}
        title={`Move ${count} ${noun} to…`}
        choices={[
          ...categories
            .filter((category) => category.id !== currentCategoryId)
            .map((category) => ({ label: category.name, value: category.id as string | null })),
          ...(anyInCategory ? [{ label: 'Out of the category (main notes list)', value: null }] : []),
        ]}
        onChoose={(categoryId) => run(() => setNotesCategory(db, ids, categoryId))}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title={`Delete ${count} ${noun} and their pictures?`}
        confirmLabel="Delete"
        onConfirm={() => run(() => deleteNotes(db, ids))}
        onCancel={() => setDialog(null)}
      />
    </View>
  );
}

/** An icon with its name under it, so each action says what it does. */
function Action({
  icon,
  label,
  onPress,
  active,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const color = danger ? 'danger' : active ? 'accentText' : 'text';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} selected notes`}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Icon name={icon} size={22} color={color} />
      <ThemedText type="small" themeColor={color}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: Radius.large,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingBottom: Spacing.two,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  count: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  action: {
    minWidth: 64,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.6,
  },
});
