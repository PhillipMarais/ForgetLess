import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CoverThumbProps = {
  uri: string;
  /** Total pictures; shown as a badge on the top-right corner. */
  count: number;
  size?: number;
};

/** A row's cover picture with how many pictures it has. */
export function CoverThumb({ uri, count, size = 48 }: CoverThumbProps) {
  const theme = useTheme();
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={count === 1 ? '1 picture' : `${count} pictures`}>
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, backgroundColor: theme.backgroundElement }]}
        contentFit="cover"
      />
      <View style={[styles.badge, { backgroundColor: theme.accent, borderColor: theme.background }]}>
        <ThemedText type="label" themeColor="onAccent" style={styles.badgeText}>
          {count > 99 ? '99+' : String(count)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: Radius.small,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0,
  },
});
