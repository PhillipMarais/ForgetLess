import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/choice-dialog';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import type { NoteSelection } from '@/components/note-selection';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteCategories, type Category } from '@/db/categories';
import { useTheme } from '@/hooks/use-theme';

/** The category's icon picture, or a category symbol when it has none. */
export function CategoryIcon({ uri, size = 52 }: { uri: string | null; size?: number }) {
  const theme = useTheme();
  return uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: Radius.medium }}
      contentFit="cover"
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, backgroundColor: theme.backgroundSelected },
      ]}>
      <Icon name={Icons.folder} size={size * 0.5} color="accentText" />
    </View>
  );
}

type CategoryCardProps = {
  category: Category;
  /** In selection mode taps select instead of opening. */
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
};

/**
 * A category in the notes list, as a card: its picture (or symbol) on top, name and note
 * count below. Tap to open; hold to select several.
 */
export function CategoryCard({ category, selecting, selected, onToggle }: CategoryCardProps) {
  const theme = useTheme();
  const count = category.noteCount === 1 ? '1 note' : `${category.noteCount} notes`;
  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={`${category.name} category, ${count}`}
      accessibilityHint={selecting ? undefined : 'Hold to select several categories'}
      onPress={() =>
        selecting ? onToggle() : router.push({ pathname: '/category/[id]', params: { id: category.id } })
      }
      onLongPress={onToggle}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: selected ? theme.accent : theme.border,
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.art, { backgroundColor: theme.backgroundSelected }]}>
        {category.iconUri ? (
          <Image source={{ uri: category.iconUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Icon name={Icons.folder} size={44} color="accentText" />
        )}
        {selecting ? (
          <View
            style={[
              styles.check,
              { borderColor: selected ? theme.accent : '#FFFFFF', backgroundColor: selected ? theme.accent : 'rgba(0,0,0,0.35)' },
            ]}>
            {selected ? <Icon name={Icons.check} size={16} color="onAccent" /> : null}
          </View>
        ) : null}
      </View>
      <View style={styles.text}>
        <ThemedText type="defaultBold" numberOfLines={1}>
          {category.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {count}
        </ThemedText>
      </View>
    </Pressable>
  );
}

/** "N selected" with Delete and Done, for selected categories. */
export function CategorySelectionBar({ selection }: { selection: NoteSelection }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const count = selection.selected.size;

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="defaultBold" style={styles.flex} accessibilityLiveRegion="polite">
        {count} {count === 1 ? 'category' : 'categories'} selected
      </ThemedText>
      <IconButton
        icon={Icons.delete}
        label="Delete selected categories"
        color="danger"
        onPress={() => setConfirming(true)}
      />
      <IconButton icon={Icons.close} label="Done selecting" onPress={selection.clear} />
      <ConfirmDialog
        visible={confirming}
        title={`Delete ${count} ${count === 1 ? 'category' : 'categories'}? Their notes are kept and move back to Notes.`}
        confirmLabel="Delete"
        onConfirm={async () => {
          setConfirming(false);
          await deleteCategories(db, [...selection.selected]);
          selection.clear();
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
  art: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  placeholder: {
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.large,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
  },
  flex: {
    flex: 1,
  },
});
