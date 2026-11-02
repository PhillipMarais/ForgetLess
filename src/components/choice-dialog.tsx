import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Choice<T> = { label: string; value: T; destructive?: boolean; disabled?: boolean };

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
            {choices.map((choice) => (
              <ChoiceButton
                key={choice.label}
                label={choice.label}
                color={choice.destructive ? 'danger' : 'accent'}
                disabled={choice.disabled}
                onPress={() => onChoose(choice.value)}
              />
            ))}
            <ChoiceButton label="Cancel" color="textSecondary" onPress={onCancel} />
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
    borderRadius: Radius.large,
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
  disabled: {
    opacity: 0.4,
  },
});

function ChoiceButton({
  label,
  color,
  disabled,
  onPress,
}: {
  label: string;
  color: 'accent' | 'danger' | 'textSecondary';
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundSelected },
        disabled && styles.disabled,
      ]}>
      <ThemedText type="defaultBold" themeColor={color}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  /** Label of the destructive button, e.g. "Delete task". */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** "Are you sure?" with one destructive button and Cancel. */
export function ConfirmDialog({ visible, title, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <ChoiceDialog
      visible={visible}
      title={title}
      choices={[{ label: confirmLabel, value: true, destructive: true }]}
      onChoose={onConfirm}
      onCancel={onCancel}
    />
  );
}
