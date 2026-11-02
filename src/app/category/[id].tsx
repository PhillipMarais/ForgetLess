import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardGrid } from '@/components/card-grid';
import { CategoryIcon } from '@/components/category-card';
import { EmptyState } from '@/components/empty-state';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { NoteCard } from '@/components/note-card';
import { SelectionBar, useNoteSelection } from '@/components/note-selection';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCategory, listCategories } from '@/db/categories';
import { listNotesInCategory } from '@/db/notes';
import { useLiveQuery } from '@/db/use-live-query';

/** One folder's notes, pinned first. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const selection = useNoteSelection();
  const { data } = useLiveQuery(['notes', 'attachments', 'note_categories'], id, async (db) => ({
    category: await getCategory(db, id),
    notes: await listNotesInCategory(db, id),
    categories: await listCategories(db),
  }));

  if (!data) return <ThemedView style={styles.fill} />;
  if (!data.category) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ title: 'Folder' }} />
        <EmptyState icon={Icons.folder} title="Folder not found" message="It may have been deleted." />
      </ThemedView>
    );
  }

  const { category, notes, categories } = data;
  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen
        options={{
          title: category.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon={Icons.edit}
                label="Edit folder"
                onPress={() =>
                  router.push({ pathname: '/category-editor/[id]', params: { id: category.id } })
                }
              />
              <IconButton
                icon={Icons.add}
                label="New note in this folder"
                variant="filled"
                onPress={() =>
                  router.push({ pathname: '/note/[id]', params: { id: 'new', category: category.id } })
                }
              />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <CategoryIcon uri={category.iconUri} size={64} />
          <View style={styles.fill}>
            <ThemedText type="subtitle" numberOfLines={2}>
              {category.name}
            </ThemedText>
            <ThemedText type="label" themeColor="textSecondary">
              {notes.length === 1 ? '1 note' : `${notes.length} notes`}
            </ThemedText>
          </View>
        </View>
        {selection.selecting ? (
          <SelectionBar selection={selection} notes={notes} categories={categories} />
        ) : null}
        {notes.length === 0 ? (
          <EmptyState
            icon={Icons.notes}
            title="This folder is empty"
            message="Tap + to write a note here, or move notes in from the notes list."
          />
        ) : (
          <CardGrid
            items={notes}
            keyOf={(note) => note.id}
            render={(note) => (
              <NoteCard
                note={note}
                selecting={selection.selecting}
                selected={selection.selected.has(note.id)}
                onToggle={() => selection.toggle(note.id)}
              />
            )}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
