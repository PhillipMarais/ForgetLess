import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardGrid } from '@/components/card-grid';
import { CategoryCard, CategorySelectionBar } from '@/components/category-card';
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
import { useLayout } from '@/hooks/use-layout';

/**
 * Pinned notes first (from any category), then categories, then the notes not in a category.
 * Hold a note to select several and pin, move or delete them together.
 */
export default function NotesScreen() {
  const selection = useNoteSelection();
  const categorySelection = useNoteSelection();
  const { width } = useLayout();
  const categoryColumns = Math.max(2, Math.min(5, Math.floor(width / 200)));
  const { data } = useLiveQuery(['notes', 'attachments', 'note_categories'], 'main', async (db) => ({
    ...(await listMainNotes(db)),
    categories: await listCategories(db),
  }));

  const pinned = data?.pinned ?? [];
  const voice = data?.voice ?? [];
  const loose = data?.loose ?? [];
  const categories = data?.categories ?? [];
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const empty = data && pinned.length + voice.length + loose.length + categories.length === 0;

  const noteGrid = (notes: Note[]) => (
    <CardGrid
      items={notes}
      keyOf={(note) => note.id}
      render={(note) => (
        <NoteCard
          note={note}
          selecting={selection.selecting}
          selected={selection.selected.has(note.id)}
          onToggle={() => {
            categorySelection.clear();
            selection.toggle(note.id);
          }}
          categoryName={note.categoryId ? categoryNames.get(note.categoryId) : undefined}
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
            icon={Icons.newCategory}
            label="New category"
            onPress={() => router.push({ pathname: '/category-editor/[id]', params: { id: 'new' } })}
          />
          <IconButton icon={Icons.mic} label="New voice note" onPress={() => router.push('/voice-note')} />
          <IconButton
            icon={Icons.add}
            label="New note"
            variant="filled"
            onPress={() => router.push({ pathname: '/note/[id]', params: { id: 'new' } })}
          />
        </View>
      }>
      <ScrollView contentContainerStyle={styles.content}>
        {categorySelection.selecting ? (
          <CategorySelectionBar selection={categorySelection} />
        ) : selection.selecting ? (
          <SelectionBar selection={selection} notes={[...pinned, ...voice, ...loose]} categories={categories} />
        ) : pinned.length + voice.length + loose.length > 1 || categories.length > 1 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Hold a note to pin, move, share or delete it (or select several).
          </ThemedText>
        ) : null}

        {empty ? (
          <EmptyState
            icon={Icons.notes}
            title="No notes yet"
            message="Tap + to write a note, or the folder button to make a category for grouping notes."
          />
        ) : null}

        {pinned.length > 0 ? <Section title="Pinned">{noteGrid(pinned)}</Section> : null}
        {categories.length > 0 ? (
          <Section title="Categories">
            <CardGrid
              items={categories}
              columns={categoryColumns}
              keyOf={(category) => category.id}
              render={(category) => (
                <CategoryCard
                  category={category}
                  selecting={categorySelection.selecting}
                  selected={categorySelection.selected.has(category.id)}
                  onToggle={() => {
                    selection.clear();
                    categorySelection.toggle(category.id);
                  }}
                />
              )}
            />
          </Section>
        ) : null}
        {voice.length > 0 ? <Section title="Voice notes">{noteGrid(voice)}</Section> : null}
        {loose.length > 0 ? (
          <Section title="Notes">
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
    alignItems: 'center',
    gap: Spacing.two,
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
