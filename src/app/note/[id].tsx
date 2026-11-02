import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { deleteNote, getNote, setNotePinned, updateNote, type Note } from '@/db/notes';
import { useTheme } from '@/hooks/use-theme';

const SAVE_DELAY_MS = 400;

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [note, setNote] = useState<Note | null | undefined>(undefined);

  // Loaded once rather than live: the editor owns the text while it's open.
  useEffect(() => {
    let active = true;
    getNote(db, id).then((loaded) => active && setNote(loaded));
    return () => {
      active = false;
    };
  }, [db, id]);

  if (note === undefined) return <ThemedView style={styles.container} />;
  if (note === null) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState icon={Icons.notes} title="Note not found" message="It may have been deleted." />
      </ThemedView>
    );
  }
  return <NoteEditor key={note.id} note={note} />;
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/notes');
}

function NoteEditor({ note }: { note: Note }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [pinned, setPinned] = useState(note.pinned);

  const latest = useRef({ title: note.title, body: note.body });
  const pendingSave = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deleted = useRef(false);

  const edit = (changes: Partial<{ title: string; body: string }>) => {
    latest.current = { ...latest.current, ...changes };
    if (changes.title !== undefined) setTitle(changes.title);
    if (changes.body !== undefined) setBody(changes.body);

    clearTimeout(pendingSave.current);
    pendingSave.current = setTimeout(() => {
      pendingSave.current = undefined;
      updateNote(db, note.id, latest.current);
    }, SAVE_DELAY_MS);
  };

  // On leaving: flush an unsaved edit, and drop the note if it was left empty.
  useEffect(() => {
    return () => {
      const unsaved = pendingSave.current !== undefined;
      clearTimeout(pendingSave.current);
      if (deleted.current) return;

      const { title, body } = latest.current;
      if (!title.trim() && !body.trim()) deleteNote(db, note.id);
      else if (unsaved) updateNote(db, note.id, latest.current);
    };
  }, [db, note.id]);

  const togglePinned = () => {
    setPinned(!pinned);
    setNotePinned(db, note.id, !pinned);
  };

  const remove = async () => {
    deleted.current = true;
    clearTimeout(pendingSave.current);
    await deleteNote(db, note.id);
    leave();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon={Icons.pin}
                label={pinned ? 'Unpin note' : 'Pin note'}
                color={pinned ? 'accent' : 'textSecondary'}
                onPress={togglePinned}
              />
              <IconButton
                icon={Icons.delete}
                label="Delete note"
                color="danger"
                onPress={remove}
              />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="interactive">
        <TextInput
          value={title}
          onChangeText={(text) => edit({ title: text })}
          placeholder="Title"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Note title"
          autoFocus={!note.title && !note.body}
          style={[styles.title, { color: theme.text }]}
        />
        <TextInput
          value={body}
          onChangeText={(text) => edit({ body: text })}
          placeholder="Start writing…"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Note text"
          multiline
          textAlignVertical="top"
          style={[styles.body, { color: theme.text }]}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerActions: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    paddingVertical: Spacing.one,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 300,
  },
});
