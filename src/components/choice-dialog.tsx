import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Choice<T> = { label: string; value: T; destructive?: boolean };

type ChoiceDialogProps<T> = {
  visible: boolean;
  title: string;
  choices: readonly Choice<T>[];
  onChoose: (value: T) => void;
  onCancel: () => void;
};

/**
 * A small modal with a list of choices and Cancel. Used instead of Alert.alert,
 * which does nothing on web.
 */
export function ChoiceDialog<T>({ visible, title, choices, onChoose, onCancel }: ChoiceDialogProps<T>) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancel">
        <Pressable
          style={[styles.dialog, { backgroundColor: theme.backgroundElement }]}
          accessibilityRole="alert"
          onPress={() => {}}>
          <ThemedText type="smallBold" style={styles.title}>
            {title}
          </ThemedText>
          <View style={[styles.choices, { borderTopColor: theme.border }]}>
            {[...choices, { label: 'Cancel', value: undefined }].map((choice) => (
              <Pressable
                key={choice.label}
                accessibilityRole="button"
                onPress={() => (choice.value === undefined ? onCancel() : onChoose(choice.value as T))}
                style={({ pressed }) => [
                  styles.choice,
                  { borderBottomColor: theme.border },
                  pressed && { backgroundColor: theme.backgroundSelected },
                ]}>
                <ThemedText
                  themeColor={
                    'destructive' in choice && choice.destructive
                      ? 'danger'
                      : choice.value === undefined
                        ? 'textSecondary'
                        : 'accent'
                  }>
                  {choice.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  title: {
    padding: Spacing.three,
    textAlign: 'center',
  },
  choices: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  choice: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
