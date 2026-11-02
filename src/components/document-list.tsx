import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PdfPages } from '@/components/pdf-pages';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { DraftDocuments } from '@/hooks/use-draft-documents';
import { useTheme } from '@/hooks/use-theme';
import { formatFileSize, type DraftDocument } from '@/lib/documents';

/** A note's PDFs: tap one to read it, remove it, or add more. */
export function DocumentList({ draft }: { draft: DraftDocuments }) {
  const theme = useTheme();
  const [viewing, setViewing] = useState<DraftDocument | null>(null);

  return (
    <View style={styles.container}>
      {draft.documents.map((document) => (
        <View key={document.key} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${document.name}`}
            onPress={() => setViewing(document)}
            style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
            <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
              <Icon name={Icons.pdf} size={22} color="danger" />
            </View>
            <View style={styles.flex}>
              <ThemedText type="defaultBold" numberOfLines={1}>
                {document.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                PDF{document.size !== null ? ` · ${formatFileSize(document.size)}` : ''}
                {document.attachment ? '' : ' · not saved yet'}
              </ThemedText>
            </View>
          </Pressable>
          <IconButton
            icon={Icons.close}
            label={`Remove ${document.name}`}
            color="textSecondary"
            onPress={() => draft.remove(document.key)}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: draft.busy }}
        disabled={draft.busy}
        onPress={draft.add}
        style={({ pressed }) => [
          styles.add,
          { borderColor: theme.border },
          (pressed || draft.busy) && styles.pressed,
        ]}>
        {draft.busy ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Icon name={Icons.attach} size={20} color="accentText" />
        )}
        <ThemedText type="smallBold" themeColor="accentText">
          Add PDF
        </ThemedText>
      </Pressable>
      {draft.error ? (
        <ThemedText type="small" themeColor="danger">
          {draft.error}
        </ThemedText>
      ) : null}

      <Modal visible={viewing !== null} animationType="slide" onRequestClose={() => setViewing(null)}>
        <View style={[styles.viewer, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.viewer}>
            <View style={[styles.viewerBar, { borderBottomColor: theme.border }]}>
              <IconButton icon={Icons.close} label="Close PDF" onPress={() => setViewing(null)} />
              <ThemedText type="defaultBold" numberOfLines={1} style={styles.flex}>
                {viewing?.name}
              </ThemedText>
            </View>
            {viewing ? <PdfPages uri={viewing.uri} /> : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.medium,
    paddingRight: Spacing.one,
  },
  open: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
  },
  viewer: {
    flex: 1,
  },
  viewerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
