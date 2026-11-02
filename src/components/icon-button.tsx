import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: IconName;
  /** Read by screen readers; the button has no visible text. */
  label: string;
  onPress: () => void;
  color?: ThemeColor;
  variant?: 'plain' | 'filled';
  disabled?: boolean;
};

export function IconButton({
  icon,
  label,
  onPress,
  color = 'text',
  variant = 'plain',
  disabled,
}: IconButtonProps) {
  const theme = useTheme();
  const filled = variant === 'filled';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={Spacing.one}
      style={({ pressed }) => [
        styles.button,
        filled && { backgroundColor: theme.accent },
        (pressed || disabled) && styles.dimmed,
      ]}>
      <Icon name={icon} size={22} color={filled ? 'onAccent' : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.5,
  },
});
