import { Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ChoiceDialog, ConfirmDialog } from '@/components/choice-dialog';
import { HeaderTextButton, KEYBOARD_GAP, leaveEditor } from '@/components/editor';
import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PhotoStrip } from '@/components/photo-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fontStyle, MaxContentWidth, Spacing } from '@/constants/theme';
import { listAttachments, type Attachment } from '@/db/attachments';
import { createNote, deleteNote, getNote, updateNote, type Note } from '@/db/notes';
import { useDraftPhotos } from '@/hooks/use-draft-photos';
import { useAppTheme } from '@/hooks/use-theme';

type Loaded = { note: Note | null; attachments: Attachment[] };

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const isNew = id === 'new';
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(
    isNew ? { note: null, attachments: [] } : undefined,
  );

  useEffect(() => {
    if (isNew) return;
    let active = true;
    (async () => {
      const note = await getNote(db, id);
      const attachments = note ? await listAttachments(db, 'note', note.id) : [];
      if (active) setLoaded(note ? { note, attachments } : null);
    })();
    return () => {
      active = false;
    };
  }, [db, id, isNew]);

  if (loaded === undefined) return <ThemedView style={styles.container} />;
  if (loaded === null) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState icon={Icons.notes} title="Note not found" message="It may have been deleted." />
      </ThemedView>
    );
  }
  return <NoteEditor key={id} {...loaded} />;
}

/**
 * Notes save only when you tap Save. Leaving with unsaved changes asks whether to save
 * or discard them; a new note that is never saved is never created.
 */
function NoteEditor({ note, attachments }: Loaded) {
  const db = useSQLiteContext();
  const theme = useAppTheme();
  const { colors } = theme;
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const photos = useDraftPhotos(attachments);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null);
  const blockedLeave = useRef<(() => void) | null>(null);

  const empty = !title.trim() && !body.trim() && photos.photos.length === 0;
  const changed =
    title !== (note?.title ?? '') ||
    body !== (note?.body ?? '') ||
    pinned !== (note?.pinned ?? false) ||
    photos.changed;
  // An empty new note has nothing worth keeping, so leaving it needs no question.
  const dirty = changed && !(note === null && empty);
  const canSave = dirty && !empty && !saving && !photos.busy;

  usePreventRemove(dirty && !leaving, ({ repeat }) => {
    blockedLeave.current = repeat;
    setDialog('leave');
  });

  // Leave once prevention is off: continue the blocked navigation, or go back after Save.
  useEffect(() => {
    if (!leaving) return;
    const resume = blockedLeave.current;
    blockedLeave.current = null;
    if (resume) resume();
    else leaveEditor('/notes');
  }, [leaving]);

  const save = async () => {
    setDialog(null);
    setSaving(true);
    const input = { title, body, pinned };
    const noteId = note ? note.id : await createNote(db, input);
    if (note) await updateNote(db, note.id, input);
    await photos.save(db, 'note', noteId);
    setLeaving(true);
  };

  const discard = () => {
    setDialog(null);
    setLeaving(true);
  };

  const remove = async () => {
    setDialog(null);
    if (note) await deleteNote(db, note.id);
    setLeaving(true);
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: note ? 'Note' : 'New note',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon={Icons.pin}
                label={pinned ? 'Unpin note' : 'Pin note'}
                color={pinned ? 'accent' : 'textSecondary'}
                onPress={() => setPinned(!pinned)}
              />
              <HeaderTextButton label="Save" onPress={save} disabled={!canSave} />
            </View>
          ),
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={KEYBOARD_GAP}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {dirty ? (
          <View style={styles.unsaved} accessibilityLiveRegion="polite">
            <View style={[styles.unsavedDot, { backgroundColor: colors.accent }]} />
            <ThemedText type="small" themeColor="textSecondary">
              Not saved yet
            </ThemedText>
          </View>
        ) : null}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Note title"
          autoFocus={note === null}
          style={[styles.title, fontStyle(theme, 'display', 600), { color: colors.text }]}
        />
        <PhotoStrip draft={photos} />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start writing…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Note text"
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          style={[styles.body, fontStyle(theme, 'body', 400), { color: colors.text }]}
        />
        {note ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDialog('delete')}
            style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
            <ThemedText themeColor="danger">Delete note</ThemedText>
          </Pressable>
        ) : null}
      </KeyboardAwareScrollView>

      <ChoiceDialog
        visible={dialog === 'leave'}
        title="This note has unsaved changes."
        choices={[
          { label: 'Save', value: 'save' as const, disabled: !canSave },
          { label: 'Discard changes', value: 'discard' as const, destructive: true },
        ]}
        onChoose={(choice) => (choice === 'save' ? save() : discard())}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Delete this note and its pictures?"
        confirmLabel="Delete note"
        onConfirm={remove}
        onCancel={() => setDialog(null)}
      />
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
    gap: Spacing.three,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unsaved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  unsavedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontSize: 24,
    paddingVertical: Spacing.one,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 160,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
