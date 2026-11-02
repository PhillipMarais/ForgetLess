import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/category-card';
import { ConfirmDialog } from '@/components/choice-dialog';
import { EditorLayout, HeaderTextButton, leaveEditor } from '@/components/editor';
import { EmptyState } from '@/components/empty-state';
import { FormSection, FormTextInput } from '@/components/form';
import { Icon, Icons, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import {
  createCategory,
  deleteCategory,
  getCategory,
  updateCategory,
  type Category,
} from '@/db/categories';
import { usePhotoPicking } from '@/hooks/use-photo-picking';
import { useTheme } from '@/hooks/use-theme';
import { deletePhotoFile } from '@/lib/photo-storage';
import { storeIcon } from '@/lib/photos';

export default function CategoryEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const isNew = id === 'new';
  const [category, setCategory] = useState<Category | null | undefined>(isNew ? null : undefined);

  useEffect(() => {
    if (isNew) return;
    let active = true;
    getCategory(db, id).then((loaded) => active && setCategory(loaded));
    return () => {
      active = false;
    };
  }, [db, id, isNew]);

  if (category === undefined) return <ThemedView style={styles.fill} />;
  if (category === null && !isNew) {
    return (
      <ThemedView style={styles.fill}>
        <EmptyState icon={Icons.category} title="Category not found" message="It may have been deleted." />
      </ThemedView>
    );
  }
  return <CategoryEditor key={id} category={category} />;
}

/** Name and icon picture for a category. Icon files picked but not saved are cleaned up. */
function CategoryEditor({ category }: { category: Category | null }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState(category?.name ?? '');
  const [iconUri, setIconUri] = useState(category?.iconUri ?? null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Icon files stored while editing; any not kept on Save are deleted on leaving.
  const pickedIcons = useRef<string[]>([]);
  const kept = useRef<string | null>(category?.iconUri ?? null);

  useEffect(
    () => () => {
      for (const uri of pickedIcons.current) if (uri !== kept.current) deletePhotoFile(uri);
    },
    [],
  );

  const picking = usePhotoPicking(async ([image]) => {
    const uri = await storeIcon(image);
    pickedIcons.current.push(uri);
    setIconUri(uri);
  });

  const save = async () => {
    setSaving(true);
    const input = { name, iconUri };
    if (category) {
      await updateCategory(db, category.id, input);
      if (category.iconUri && category.iconUri !== iconUri) deletePhotoFile(category.iconUri);
    } else {
      await createCategory(db, input);
    }
    kept.current = iconUri;
    leaveEditor('/notes');
  };

  const remove = async () => {
    setConfirmingDelete(false);
    if (!category) return;
    await deleteCategory(db, category.id);
    if (category.iconUri) deletePhotoFile(category.iconUri);
    kept.current = null;
    leaveEditor('/notes');
  };

  const valid = name.trim().length > 0 && !saving && !picking.busy;

  return (
    <EditorLayout>
      <Stack.Screen
        options={{
          title: category ? 'Edit category' : 'New category',
          headerRight: () => <HeaderTextButton label="Save" onPress={save} disabled={!valid} />,
        }}
      />
      <FormTextInput
        value={name}
        onChangeText={setName}
        placeholder="Category name"
        accessibilityLabel="Category name"
        autoFocus={!category}
        variant="title"
      />

      <FormSection label="Icon">
        <View style={styles.iconRow}>
          {picking.busy ? (
            <View style={[styles.iconBusy, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : (
            <CategoryIcon uri={iconUri} size={88} />
          )}
          <View style={styles.iconButtons}>
            <IconAction icon={Icons.photo} label="Choose picture" onPress={() => picking.pick('library')} />
            <IconAction icon={Icons.camera} label="Take photo" onPress={() => picking.pick('camera')} />
            {iconUri ? (
              <IconAction icon={Icons.close} label="Use the default icon" onPress={() => setIconUri(null)} />
            ) : null}
          </View>
        </View>
        {picking.error ? (
          <ThemedText type="small" themeColor="danger">
            {picking.error}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            The icon shows next to the category in your notes list.
          </ThemedText>
        )}
      </FormSection>

      {category ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmingDelete(true)}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
          <ThemedText themeColor="danger">Delete category</ThemedText>
        </Pressable>
      ) : null}

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete the “${category?.name}” category? Its notes are kept and move back to Notes.`}
        confirmLabel="Delete category"
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </EditorLayout>
  );
}

function IconAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={18} color="accentText" />
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBusy: {
    width: 88,
    height: 88,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtons: {
    flex: 1,
    gap: Spacing.two,
  },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
