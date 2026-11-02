import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  ScrollView,
  useExclusiveGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, Icons, type IconName } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { DraftPhotos } from '@/hooks/use-draft-photos';
import { useTheme } from '@/hooks/use-theme';

const TILE = 88;
const GAP = Spacing.two;
const STEP = TILE + GAP;

/**
 * Thumbnails of an editor's pictures plus Camera and Gallery buttons. Hold and drag a
 * picture to reorder; the first one is the cover. Tap a picture to view it.
 */
export function PhotoStrip({ draft }: { draft: DraftPhotos }) {
  const theme = useTheme();
  const [viewing, setViewing] = useState<string | null>(null);
  const viewedIndex = draft.photos.findIndex((photo) => photo.key === viewing);
  const viewed = viewedIndex >= 0 ? draft.photos[viewedIndex] : undefined;

  // Shared by all tiles: which tile is being dragged, where it would land, and how far it moved.
  const activeIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const dragX = useSharedValue(0);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {draft.photos.map((photo, index) => (
          <SortableTile
            key={photo.key}
            uri={photo.uri}
            index={index}
            count={draft.photos.length}
            activeIndex={activeIndex}
            targetIndex={targetIndex}
            dragX={dragX}
            onOpen={() => setViewing(photo.key)}
            onMove={draft.move}
          />
        ))}
        {draft.busy ? (
          <View style={[styles.tile, styles.center]}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : null}
        <AddTile icon={Icons.camera} label="Camera" onPress={() => draft.add('camera')} disabled={draft.busy} />
        <AddTile icon={Icons.photo} label="Gallery" onPress={() => draft.add('library')} disabled={draft.busy} />
      </ScrollView>
      {draft.photos.length > 1 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Hold and drag a picture to reorder. The first one is the cover.
        </ThemedText>
      ) : null}
      {draft.error ? (
        <ThemedText type="small" themeColor="danger">
          {draft.error}
        </ThemedText>
      ) : null}

      <Modal visible={viewed !== undefined} animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.viewerSafeArea}>
            <View style={styles.viewerBar}>
              <IconButton icon={Icons.close} label="Close picture" onPress={() => setViewing(null)} />
              <View style={styles.viewerActions}>
                {viewedIndex > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => viewed && draft.makeCover(viewed.key)}
                    style={({ pressed }) => [
                      styles.coverButton,
                      { borderColor: theme.accent },
                      pressed && styles.dimmed,
                    ]}>
                    <Icon name={Icons.star} size={16} color="accent" />
                    <ThemedText type="smallBold" themeColor="accent">
                      Make cover
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText type="label">Cover</ThemedText>
                )}
                <IconButton
                  icon={Icons.delete}
                  label="Remove picture"
                  color="danger"
                  onPress={() => {
                    if (viewed) draft.remove(viewed.key);
                    setViewing(null);
                  }}
                />
              </View>
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

type SortableTileProps = {
  uri: string;
  index: number;
  count: number;
  activeIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  dragX: SharedValue<number>;
  onOpen: () => void;
  onMove: (from: number, to: number) => void;
};

function SortableTile({
  uri,
  index,
  count,
  activeIndex,
  targetIndex,
  dragX,
  onOpen,
  onMove,
}: SortableTileProps) {
  const theme = useTheme();

  const pan = usePanGesture({
    activateAfterLongPress: 250,
    onActivate: () => {
      'worklet';
      activeIndex.set(index);
      targetIndex.set(index);
      dragX.set(0);
    },
    onUpdate: (event) => {
      'worklet';
      dragX.set(event.translationX);
      targetIndex.set(Math.max(0, Math.min(count - 1, Math.round(index + event.translationX / STEP))));
    },
    onDeactivate: () => {
      'worklet';
      const to = targetIndex.get();
      if (to !== index) scheduleOnRN(onMove, index, to);
    },
    onFinalize: () => {
      'worklet';
      activeIndex.set(-1);
      targetIndex.set(-1);
      dragX.set(0);
    },
  });
  const tap = useTapGesture({ runOnJS: true, onActivate: onOpen });
  const gesture = useExclusiveGestures(pan, tap);

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.get();
    const target = targetIndex.get();
    if (active === index) {
      return { zIndex: 10, transform: [{ translateX: dragX.get() }, { scale: 1.08 }] };
    }
    // Tiles between the dragged tile and its landing spot slide over to make room.
    let shift = 0;
    if (active !== -1 && active < index && index <= target) shift = -STEP;
    if (active !== -1 && target <= index && index < active) shift = STEP;
    return { zIndex: 0, transform: [{ translateX: withTiming(shift, { duration: 150 }) }, { scale: 1 }] };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={animatedStyle}
        accessible
        accessibilityRole="imagebutton"
        accessibilityLabel={`Picture ${index + 1} of ${count}${index === 0 ? ', cover' : ''}`}
        accessibilityActions={[
          { name: 'activate', label: 'View' },
          ...(index > 0 ? [{ name: 'moveEarlier', label: 'Move earlier' }] : []),
          ...(index < count - 1 ? [{ name: 'moveLater', label: 'Move later' }] : []),
        ]}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'activate') onOpen();
          if (nativeEvent.actionName === 'moveEarlier') onMove(index, index - 1);
          if (nativeEvent.actionName === 'moveLater') onMove(index, index + 1);
        }}>
        <Image source={{ uri }} style={styles.tile} contentFit="cover" />
        {index === 0 ? (
          <View style={[styles.coverBadge, { backgroundColor: theme.accent }]}>
            <ThemedText type="label" themeColor="onAccent" style={styles.coverText}>
              Cover
            </ThemedText>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
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
        styles.tile,
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
    gap: GAP,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: Radius.medium,
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
  coverBadge: {
    position: 'absolute',
    left: Spacing.one,
    bottom: Spacing.one,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.one,
  },
  coverText: {
    fontSize: 10,
    lineHeight: 14,
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
    alignItems: 'center',
    padding: Spacing.two,
  },
  viewerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  coverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  viewerImage: {
    flex: 1,
  },
});
