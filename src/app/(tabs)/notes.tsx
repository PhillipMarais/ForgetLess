import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createNote, listNotes, type Note } from '@/db/notes';
import { useLiveQuery } from '@/db/use-live-query';
import { useTheme } from '@/hooks/use-theme';
import { formatDueLabel } from '@/lib/dates';

export default function NotesScreen() {
  const db = useSQLiteContext();
  const { data: notes } = useLiveQuery(['notes', 'attachments'], 'all', listNotes);

  const newNote = async () => {
    const id = await createNote(db);
    router.push({ pathname: '/note/[id]', params: { id } });
  };

  return (
    <Screen
      title="Notes"
      action={<IconButton icon={Icons.add} label="New note" variant="filled" onPress={newNote} />}>
      <FlatList
        data={notes ?? []}
        keyExtractor={(note) => note.id}
        renderItem={({ item }) => <NoteCard note={item} />}
        contentContainerStyle={styles.list}
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
    </Screen>
  );
}

function NoteCard({ note }: { note: Note }) {
  const theme = useTheme();
  const title = note.title.trim() || 'Untitled';
  const preview = note.body.trim().split('\n')[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.cardTitle}>
          {title}
        </ThemedText>
        {note.attachmentCount > 0 ? (
          <Icon name={Icons.photo} size={16} color="textSecondary" />
        ) : null}
        {note.pinned ? <Icon name={Icons.pin} size={16} color="textSecondary" /> : null}
      </View>
      {preview ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {preview}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
        Edited {formatDueLabel(note.updatedAt, true)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
