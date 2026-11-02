import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Icons, type IconName } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoSource } from '@/lib/pick-photo';

const TILE = 88;

type PhotoStripProps = {
  photos: readonly { key: string; uri: string }[];
  onAdd: (source: PhotoSource) => void;
  onRemove: (key: string) => void;
  busy?: boolean;
  error?: string | null;
};

/** Thumbnails of attached pictures plus Camera and Gallery buttons. Tap a picture to view it. */
export function PhotoStrip({ photos, onAdd, onRemove, busy, error }: PhotoStripProps) {
  const theme = useTheme();
  const [viewing, setViewing] = useState<string | null>(null);
  const viewed = photos.find((photo) => photo.key === viewing);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((photo, index) => (
          <Pressable
            key={photo.key}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Picture ${index + 1} of ${photos.length}`}
            onPress={() => setViewing(photo.key)}>
            <Image source={{ uri: photo.uri }} style={styles.thumbnail} contentFit="cover" />
          </Pressable>
        ))}
        {busy ? (
          <View style={[styles.thumbnail, styles.center]}>
            <ActivityIndicator />
          </View>
        ) : null}
        <AddTile icon={Icons.camera} label="Camera" onPress={() => onAdd('camera')} disabled={busy} />
        <AddTile icon={Icons.photo} label="Gallery" onPress={() => onAdd('library')} disabled={busy} />
      </ScrollView>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Modal
        visible={viewed !== undefined}
        animationType="fade"
        onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.viewerSafeArea}>
            <View style={styles.viewerBar}>
              <IconButton
                icon={Icons.close}
                label="Close picture"
                onPress={() => setViewing(null)}
              />
              <IconButton
                icon={Icons.delete}
                label="Remove picture"
                color="danger"
                onPress={() => {
                  if (viewed) onRemove(viewed.key);
                  setViewing(null);
                }}
              />
            </View>
            {viewed ? (
              <Image source={{ uri: viewed.uri }} style={styles.viewerImage} contentFit="contain" />
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

function AddTile({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add picture from ${label.toLowerCase()}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.thumbnail,
        styles.center,
        styles.addTile,
        { borderColor: theme.border },
        (pressed || disabled) && styles.dimmed,
      ]}>
      <Icon name={icon} size={24} color="textSecondary" />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  thumbnail: {
    width: TILE,
    height: TILE,
    borderRadius: Spacing.two,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: Spacing.half,
  },
  dimmed: {
    opacity: 0.5,
  },
  viewer: {
    flex: 1,
  },
  viewerSafeArea: {
    flex: 1,
  },
  viewerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.two,
  },
  viewerImage: {
    flex: 1,
  },
});
