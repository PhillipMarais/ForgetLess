import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Rendered at the right of the title, e.g. an add button. */
  action?: ReactNode;
}>;

/** Top-level layout for a tab screen: safe area, large title, centered content column. */
export function Screen({ title, subtitle, action, children }: ScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
            <ThemedText type="subtitle">{title}</ThemedText>
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
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
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
  },
  content: {
    flex: 1,
  },
});
