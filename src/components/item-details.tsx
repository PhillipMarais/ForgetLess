import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { listAttachments, type OwnerType } from '@/db/attachments';
import { useLiveQuery } from '@/db/use-live-query';
import { useControlSize, useTheme } from '@/hooks/use-theme';

/** A small round button that shows or hides a row's extra details. */
export function ExpandButton({
  expanded,
  onPress,
  label,
}: {
  expanded: boolean;
  onPress: () => void;
  /** What is shown or hidden, e.g. "notes and pictures for Gym". */
  label: string;
}) {
  const theme = useTheme();
  const size = useControlSize(36);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expanded ? 'Hide' : 'Show'} ${label}`}
      accessibilityState={{ expanded }}
      onPress={onPress}
      hitSlop={Spacing.one}
      style={({ pressed }) => [
        styles.expand,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <Icon name={expanded ? Icons.collapse : Icons.expand} size={20} color="textSecondary" />
    </Pressable>
  );
}

/** The notes and pictures of a task or event, shown when its row is expanded. */
export function ItemDetails({
  ownerType,
  ownerId,
  notes,
}: {
  ownerType: OwnerType;
  ownerId: string;
  notes: string | null;
}) {
  const theme = useTheme();
  const { data: pictures } = useLiveQuery(['attachments'], `${ownerType}:${ownerId}`, (db) =>
    listAttachments(db, ownerType, ownerId),
  );
  const text = notes?.trim();

  return (
    <View style={styles.details}>
      {text ? (
        <ThemedText type="small" themeColor="textSecondary">
          {text}
        </ThemedText>
      ) : null}
      {pictures && pictures.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pictures}>
          {pictures.map((picture) => (
            <Image
              key={picture.id}
              source={{ uri: picture.uri }}
              style={[styles.picture, { backgroundColor: theme.backgroundElement }]}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ))}
        </ScrollView>
      ) : null}
      {!text && pictures?.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No notes or pictures.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  expand: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  details: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  pictures: {
    gap: Spacing.two,
  },
  picture: {
    width: 96,
    height: 96,
    borderRadius: Radius.medium,
  },
});
