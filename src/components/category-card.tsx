import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/db/categories';
import { useTheme } from '@/hooks/use-theme';

/** The folder's icon picture, or a folder symbol when it has none. */
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

/** A folder in the notes list; opens the folder. */
export function CategoryCard({ category }: { category: Category }) {
  const theme = useTheme();
  const count = category.noteCount === 1 ? '1 note' : `${category.noteCount} notes`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name} folder, ${count}`}
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: category.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <CategoryIcon uri={category.iconUri} />
      <View style={styles.text}>
        <ThemedText type="heading" numberOfLines={1}>
          {category.name}
        </ThemedText>
        <ThemedText type="label" themeColor="textSecondary" style={styles.count}>
          {count}
        </ThemedText>
      </View>
      <Icon name={Icons.next} size={20} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
  },
  placeholder: {
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  count: {
    fontSize: 11,
  },
  pressed: {
    opacity: 0.8,
  },
});
