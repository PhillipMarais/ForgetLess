import { Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipGroup } from '@/components/chip';
import { ChoiceDialog, ConfirmDialog } from '@/components/choice-dialog';
import { DictationButton } from '@/components/dictation-button';
import { HeaderTextButton, KEYBOARD_GAP, leaveEditor } from '@/components/editor';
import { DocumentList } from '@/components/document-list';
import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PhotoStrip } from '@/components/photo-strip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fontStyle, MaxContentWidth, Spacing } from '@/constants/theme';
import { listAttachments, type Attachment } from '@/db/attachments';
import { listCategories } from '@/db/categories';
import { createNote, deleteNote, getNote, updateNote, type Note } from '@/db/notes';
import { useLiveQuery } from '@/db/use-live-query';
import { useDraftDocuments } from '@/hooks/use-draft-documents';
import { appendSentence, useDictation } from '@/hooks/use-dictation';
import { useDraftPhotos } from '@/hooks/use-draft-photos';
import { useAppTheme, useFontSize } from '@/hooks/use-theme';

type Loaded = { note: Note | null; attachments: Attachment[]; documents: Attachment[] };

export default function NoteScreen() {
  // `category` pre-selects a category for a new note (from a category's + button).
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const db = useSQLiteContext();
  const isNew = id === 'new';
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(
    isNew ? { note: null, attachments: [], documents: [] } : undefined,
  );

  useEffect(() => {
    if (isNew) return;
    let active = true;
    (async () => {
      const note = await getNote(db, id);
      const attachments = note ? await listAttachments(db, 'note', note.id) : [];
      const documents = note ? await listAttachments(db, 'note', note.id, 'documents') : [];
      if (active) setLoaded(note ? { note, attachments, documents } : null);
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
  return (
    <NoteEditor
      key={id}
      {...loaded}
      newNoteCategory={category ?? null}
    />
  );
}

/**
 * Notes save only when you tap Save. Leaving with unsaved changes asks whether to save
 * or discard them; a new note that is never saved is never created.
 */
function NoteEditor({
  note,
  attachments,
  documents,
  newNoteCategory,
}: Loaded & { newNoteCategory: string | null }) {
  const db = useSQLiteContext();
  const theme = useAppTheme();
  const { colors } = theme;
  const titleSize = useFontSize(24);
  const bodySize = useFontSize(16);
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const dictation = useDictation((sentence) => setBody((current) => appendSentence(current, sentence)));

  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const initialCategory = note ? note.categoryId : newNoteCategory;
  const [categoryId, setCategoryId] = useState(initialCategory);
  const { data: categories = [] } = useLiveQuery(['note_categories'], 'categories', listCategories);
  const photos = useDraftPhotos(attachments);
  const files = useDraftDocuments(documents);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dialog, setDialog] = useState<'leave' | 'delete' | null>(null);
  const blockedLeave = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();

  const empty =
    !title.trim() &&
    !body.trim() &&
    photos.photos.length === 0 &&
    files.documents.length === 0;
  const changed =
    title !== (note?.title ?? '') ||
    body !== (note?.body ?? '') ||
    pinned !== (note?.pinned ?? false) ||
    categoryId !== initialCategory ||
    photos.changed ||
    files.changed;
  // An empty new note has nothing worth keeping, so leaving it needs no question.
  const dirty = changed && !(note === null && empty);
  const canSave = dirty && !empty && !saving && !photos.busy && !files.busy;

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
    if (dictation.listening) dictation.stop();
    const input = { title, body, pinned, categoryId };
    const noteId = note ? note.id : await createNote(db, input);
    if (note) await updateNote(db, note.id, input);
    await photos.save(db, 'note', noteId);
    await files.save(db, 'note', noteId);
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
                color={pinned ? 'accentText' : 'textSecondary'}
                onPress={() => setPinned(!pinned)}
              />
              <HeaderTextButton label="Save" onPress={save} disabled={!canSave} />
            </View>
          ),
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={KEYBOARD_GAP}
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.four + insets.bottom }]}
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
          style={[styles.title, fontStyle(theme, 'display', 600), { color: colors.text, fontSize: titleSize }]}
        />
        {categories.length > 0 ? (
          <ChipGroup
            label="Category"
            options={[
              { label: 'No category', value: null },
              ...categories.map((category) => ({ label: category.name, value: category.id as string | null })),
            ]}
            value={categoryId}
            onChange={setCategoryId}
          />
        ) : null}
        <PhotoStrip draft={photos} />
        <DocumentList draft={files} />
        <DictationButton
          listening={dictation.listening}
          partial={dictation.partial}
          error={dictation.error}
          onStart={dictation.start}
          onStop={dictation.stop}
          label="Speak to write"
          languageName={dictation.languageName}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start writing…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Note text"
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          style={[
            styles.body,
            fontStyle(theme, 'body', 400),
            { color: colors.text, fontSize: bodySize, lineHeight: Math.round(bodySize * 1.5) },
          ]}
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
        title="Delete this note, its pictures and PDFs?"
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
