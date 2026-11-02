import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = PropsWithChildren<{
  title: string;
  /** Small label above the title, e.g. the date. */
  subtitle?: string;
  /** Rendered at the right of the title, e.g. buttons. */
  action?: ReactNode;
  /** Use the full window width (for two-column layouts) instead of a centred column. */
  fullWidth?: boolean;
}>;

/** Top-level layout for a tab screen: safe area, large title, content area. */
export function Screen({ title, subtitle, action, fullWidth, children }: ScreenProps) {
  const theme = useTheme();
  const { wide } = useLayout();

  return (
    <ThemedView style={styles.container}>
      {theme.glow !== 'transparent' ? (
        <LinearGradient
          pointerEvents="none"
          colors={[theme.glow, 'transparent']}
          style={styles.glow}
        />
      ) : null}
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safeArea, !fullWidth && styles.column, wide && styles.wide]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            {subtitle ? <ThemedText type="label">{subtitle}</ThemedText> : null}
            <ThemedText type="subtitle" numberOfLines={1}>
              {title}
            </ThemedText>
          </View>
          {action}
        </View>
        <View style={styles.content}>{children}</View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  column: {
    maxWidth: 800,
    alignSelf: 'center',
  },
  wide: {
    paddingHorizontal: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  content: {
    flex: 1,
  },
});
