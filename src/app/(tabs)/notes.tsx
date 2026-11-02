import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/choice-dialog';
import { CoverThumb } from '@/components/cover-thumb';
import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteNote, deleteNotes, listNotes, setNotesPinned, type Note } from '@/db/notes';
import { useLiveQuery } from '@/db/use-live-query';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';
import { formatDueLabel } from '@/lib/dates';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const { width, wide } = useLayout();
  const { data: notes } = useLiveQuery(['notes', 'attachments'], 'all', listNotes);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const selecting = selected.size > 0;
  const columns = width >= 1100 ? 3 : wide ? 2 : 1;

  // Android back leaves selection mode instead of the screen.
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

  const selectedNotes = (notes ?? []).filter((note) => selected.has(note.id));
  const allPinned = selectedNotes.length > 0 && selectedNotes.every((note) => note.pinned);

  const pinSelected = async () => {
    await setNotesPinned(db, [...selected], !allPinned);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    setConfirmingBulkDelete(false);
    await deleteNotes(db, [...selected]);
    setSelected(new Set());
  };

  return (
    <Screen
      title={selecting ? `${selected.size} selected` : 'Notes'}
      fullWidth
      action={
        selecting ? (
          <View style={styles.actions}>
            <IconButton
              icon={Icons.pin}
              label={allPinned ? 'Unpin selected notes' : 'Pin selected notes'}
              color={allPinned ? 'accent' : 'text'}
              onPress={pinSelected}
            />
            <IconButton
              icon={Icons.delete}
              label="Delete selected notes"
              color="danger"
              onPress={() => setConfirmingBulkDelete(true)}
            />
            <IconButton
              icon={Icons.close}
              label="Cancel selection"
              onPress={() => setSelected(new Set())}
            />
          </View>
        ) : (
          <IconButton
            icon={Icons.add}
            label="New note"
            variant="filled"
            onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })}
          />
        )
      }>
      <FlatList
        key={columns}
        data={notes ?? []}
        numColumns={columns}
        keyExtractor={(note) => note.id}
        columnWrapperStyle={columns > 1 ? styles.columns : undefined}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            selecting={selecting}
            selected={selected.has(item.id)}
            onToggle={() => toggle(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          notes && notes.length > 1 && !selecting ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Hold a note to select several.
            </ThemedText>
          ) : undefined
        }
        ListEmptyComponent={
          notes ? (
            <EmptyState
              icon={Icons.notes}
              title="No notes yet"
              message="Tap + to write your first note."
            />
          ) : undefined
        }
      />
      <ConfirmDialog
        visible={confirmingBulkDelete}
        title={`Delete ${selected.size} ${selected.size === 1 ? 'note' : 'notes'} and their pictures?`}
        confirmLabel="Delete"
        onConfirm={deleteSelected}
        onCancel={() => setConfirmingBulkDelete(false)}
      />
    </Screen>
  );
}

type NoteCardProps = {
  note: Note;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
};

function NoteCard({ note, selecting, selected, onToggle }: NoteCardProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const title = note.title.trim() || 'Untitled';
  const preview = note.body.trim().split('\n')[0];

  // The card frame holds two siblings, the tap area and the delete button: a button inside a
  // button is invalid on web and confusing for screen readers.
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.accent : 'transparent',
        },
      ]}>
      <Pressable
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={title}
        accessibilityHint={selecting ? undefined : 'Hold to select several notes'}
        onPress={() =>
          selecting ? onToggle() : router.push({ pathname: '/note/[id]', params: { id: note.id } })
        }
        onLongPress={onToggle}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            {selecting ? (
              <View
                style={[
                  styles.selectCircle,
                  { borderColor: selected ? theme.accent : theme.textSecondary },
                  selected && { backgroundColor: theme.accent },
                ]}>
                {selected ? <Icon name={Icons.check} size={14} color="onAccent" /> : null}
              </View>
            ) : null}
            <ThemedText type="heading" numberOfLines={1} style={styles.cardTitle}>
              {title}
            </ThemedText>
            {note.pinned ? <Icon name={Icons.pin} size={16} color="accent" /> : null}
          </View>
          {preview ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {preview}
            </ThemedText>
          ) : null}
          <ThemedText type="label" themeColor="textSecondary" style={styles.date}>
            Edited {formatDueLabel(note.updatedAt, true)}
          </ThemedText>
        </View>
        {note.coverUri ? (
          <CoverThumb uri={note.coverUri} count={note.attachmentCount} size={64} />
        ) : null}
      </Pressable>
      {!selecting ? (
        <View style={styles.cardDelete}>
          <IconButton
            icon={Icons.delete}
            label={`Delete ${title}`}
            color="textSecondary"
            onPress={() => setConfirming(true)}
          />
        </View>
      ) : null}
      {confirming ? (
        <ConfirmDialog
          visible
          title={`Delete “${title}” and its pictures?`}
          confirmLabel="Delete note"
          onConfirm={() => {
            setConfirming(false);
            deleteNote(db, note.id);
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  columns: {
    gap: Spacing.three,
  },
  hint: {
    marginBottom: -Spacing.one,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: Radius.large,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  cardDelete: {
    justifyContent: 'flex-end',
    paddingRight: Spacing.one,
    paddingBottom: Spacing.one,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
  },
  date: {
    fontSize: 11,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.8,
  },
});
