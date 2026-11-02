import { Pressable, StyleSheet } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { showToast } from '@/components/toast';
import { Spacing } from '@/constants/theme';

type ClearTextButtonProps = {
  text: string;
  onChange: (text: string) => void;
  /** What is cleared, for the button's screen-reader label and the toast, e.g. "Notes". */
  what?: string;
};

/** "Clear" for a notes field; shows only when there is text, with Undo in a toast after. */
export function ClearTextButton({ text, onChange, what = 'Notes' }: ClearTextButtonProps) {
  if (!text.trim()) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Clear ${what.toLowerCase()}`}
      hitSlop={Spacing.two}
      onPress={() => {
        const before = text;
        onChange('');
        showToast(`${what} cleared`, { label: 'Undo', run: () => onChange(before) });
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon name={Icons.clear} size={16} color="textSecondary" />
      <ThemedText type="smallBold" themeColor="textSecondary">
        Clear
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
