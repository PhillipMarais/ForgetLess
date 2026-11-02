import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardGrid } from '@/components/card-grid';
import { CategoryCard } from '@/components/category-card';
import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { NoteCard } from '@/components/note-card';
import { SelectionBar, useNoteSelection } from '@/components/note-selection';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { listCategories } from '@/db/categories';
import { listMainNotes, type Note } from '@/db/notes';
import { useLiveQuery } from '@/db/use-live-query';

/**
 * Pinned notes first (from any folder), then folders, then the notes not in a folder.
 * Hold a note to select several and pin, move or delete them together.
 */
export default function NotesScreen() {
  const selection = useNoteSelection();
  const { data } = useLiveQuery(['notes', 'attachments', 'note_categories'], 'main', async (db) => ({
    ...(await listMainNotes(db)),
    categories: await listCategories(db),
  }));

  const pinned = data?.pinned ?? [];
  const loose = data?.loose ?? [];
  const categories = data?.categories ?? [];
  const folderNames = new Map(categories.map((category) => [category.id, category.name]));
  const empty = data && pinned.length + loose.length + categories.length === 0;

  const noteGrid = (notes: Note[]) => (
    <CardGrid
      items={notes}
      keyOf={(note) => note.id}
      render={(note) => (
        <NoteCard
          note={note}
          selecting={selection.selecting}
          selected={selection.selected.has(note.id)}
          onToggle={() => selection.toggle(note.id)}
          folderName={note.categoryId ? folderNames.get(note.categoryId) : undefined}
        />
      )}
    />
  );

  return (
    <Screen
      title="Notes"
      fullWidth
      action={
        <View style={styles.actions}>
          <IconButton
            icon={Icons.newFolder}
            label="New folder"
            onPress={() => router.push({ pathname: '/category-editor/[id]', params: { id: 'new' } })}
          />
          <IconButton
            icon={Icons.add}
            label="New note"
            variant="filled"
            onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })}
          />
        </View>
      }>
      <ScrollView contentContainerStyle={styles.content}>
        {selection.selecting ? (
          <SelectionBar selection={selection} notes={[...pinned, ...loose]} categories={categories} />
        ) : pinned.length + loose.length > 1 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Hold a note to select several.
          </ThemedText>
        ) : null}

        {empty ? (
          <EmptyState
            icon={Icons.notes}
            title="No notes yet"
            message="Tap + to write a note, or the folder button to make a folder."
          />
        ) : null}

        {pinned.length > 0 ? <Section title="Pinned">{noteGrid(pinned)}</Section> : null}
        {categories.length > 0 ? (
          <Section title="Folders">
            <CardGrid
              items={categories}
              keyOf={(category) => category.id}
              render={(category) => <CategoryCard category={category} />}
            />
          </Section>
        ) : null}
        {loose.length > 0 ? (
          <Section title={pinned.length > 0 || categories.length > 0 ? 'Notes' : ''}>
            {noteGrid(loose)}
          </Section>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <ThemedText type="label">{title}</ThemedText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
});
