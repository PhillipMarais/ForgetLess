import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/choice-dialog';
import { CoverThumb } from '@/components/cover-thumb';
import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteNote, type Note } from '@/db/notes';
import { useTheme } from '@/hooks/use-theme';
import { formatDueLabel } from '@/lib/dates';

type NoteCardProps = {
  note: Note;
  /** In selection mode taps select instead of opening. */
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  /** Folder name, shown on pinned notes that live in a folder. */
  folderName?: string;
};

export function NoteCard({ note, selecting, selected, onToggle, folderName }: NoteCardProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const title = note.title.trim() || 'Untitled';
  const preview = note.body.trim().split('\n')[0];

  // The card frame holds two siblings, the tap area and the delete button: a button inside a
  // button is invalid on web and confusing for screen readers.
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.accent : 'transparent',
        },
      ]}>
      <Pressable
        accessibilityRole={selecting ? 'checkbox' : 'button'}
        accessibilityState={selecting ? { checked: selected } : undefined}
        accessibilityLabel={title}
        accessibilityHint={selecting ? undefined : 'Hold to select several notes'}
        onPress={() =>
          selecting ? onToggle() : router.push({ pathname: '/note/[id]', params: { id: note.id } })
        }
        onLongPress={onToggle}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={styles.body}>
          <View style={styles.header}>
            {selecting ? (
              <View
                style={[
                  styles.selectCircle,
                  { borderColor: selected ? theme.accent : theme.textSecondary },
                  selected && { backgroundColor: theme.accent },
                ]}>
                {selected ? <Icon name={Icons.check} size={14} color="onAccent" /> : null}
              </View>
            ) : null}
            <ThemedText type="heading" numberOfLines={1} style={styles.title}>
              {title}
            </ThemedText>
            {note.pinned ? <Icon name={Icons.pin} size={16} color="accentText" /> : null}
          </View>
          {preview ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {preview}
            </ThemedText>
          ) : null}
          <View style={styles.meta}>
            <ThemedText type="label" themeColor="textSecondary" style={styles.metaText}>
              Edited {formatDueLabel(note.updatedAt, true)}
            </ThemedText>
            {folderName ? (
              <>
                <Icon name={Icons.folder} size={12} color="textSecondary" />
                <ThemedText type="label" themeColor="textSecondary" style={styles.metaText} numberOfLines={1}>
                  {folderName}
                </ThemedText>
              </>
            ) : null}
          </View>
        </View>
        {note.coverUri ? (
          <CoverThumb uri={note.coverUri} count={note.attachmentCount} size={64} />
        ) : null}
      </Pressable>
      {!selecting ? (
        <View style={styles.delete}>
          <IconButton
            icon={Icons.delete}
            label={`Delete ${title}`}
            color="textSecondary"
            onPress={() => setConfirming(true)}
          />
        </View>
      ) : null}
      {confirming ? (
        <ConfirmDialog
          visible
          title={`Delete “${title}” and its pictures?`}
          confirmLabel="Delete note"
          onConfirm={() => {
            setConfirming(false);
            deleteNote(db, note.id);
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: Radius.large,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  delete: {
    justifyContent: 'flex-end',
    paddingRight: Spacing.one,
    paddingBottom: Spacing.one,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  metaText: {
    fontSize: 11,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
