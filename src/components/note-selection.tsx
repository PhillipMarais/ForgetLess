import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { ChoiceDialog, ConfirmDialog } from '@/components/choice-dialog';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/db/categories';
import { deleteNotes, setNotesCategory, setNotesPinned, type Note } from '@/db/notes';
import { useTheme } from '@/hooks/use-theme';

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
  /** Categories to offer under "Move to category". */
  categories: readonly Category[];
};

/** "N selected" with Pin, Move to category, Delete and Done. */
export function SelectionBar({ selection, notes, categories }: SelectionBarProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [dialog, setDialog] = useState<'move' | 'delete' | null>(null);
  const ids = [...selection.selected];
  const chosen = notes.filter((note) => selection.selected.has(note.id));
  const allPinned = chosen.length > 0 && chosen.every((note) => note.pinned);
  const count = selection.selected.size;

  const run = async (action: () => Promise<void>) => {
    setDialog(null);
    await action();
    selection.clear();
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="defaultBold" style={styles.count} accessibilityLiveRegion="polite">
        {count} selected
      </ThemedText>
      <IconButton
        icon={Icons.pin}
        label={allPinned ? 'Unpin selected notes' : 'Pin selected notes'}
        color={allPinned ? 'accentText' : 'text'}
        onPress={() => run(() => setNotesPinned(db, ids, !allPinned))}
      />
      <IconButton icon={Icons.moveToCategory} label="Move selected notes to a category" onPress={() => setDialog('move')} />
      <IconButton
        icon={Icons.delete}
        label="Delete selected notes"
        color="danger"
        onPress={() => setDialog('delete')}
      />
      <IconButton icon={Icons.close} label="Done selecting" onPress={selection.clear} />

      <ChoiceDialog
        visible={dialog === 'move'}
        title={`Move ${count} ${count === 1 ? 'note' : 'notes'} to…`}
        choices={[
          ...categories.map((category) => ({ label: category.name, value: category.id as string | null })),
          { label: 'No category', value: null },
        ]}
        onChoose={(categoryId) => run(() => setNotesCategory(db, ids, categoryId))}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title={`Delete ${count} ${count === 1 ? 'note' : 'notes'} and their pictures?`}
        confirmLabel="Delete"
        onConfirm={() => run(() => deleteNotes(db, ids))}
        onCancel={() => setDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.large,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
  },
  count: {
    flex: 1,
  },
});
