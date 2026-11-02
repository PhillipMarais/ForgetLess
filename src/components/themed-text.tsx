import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontStyle, type FontRole, type FontWeight, type ThemeColor } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export type TextType =
  | 'title'
  | 'subtitle'
  | 'heading'
  | 'default'
  | 'defaultBold'
  | 'small'
  | 'smallBold'
  | 'label'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

const FONTS: Record<TextType, [FontRole, FontWeight]> = {
  title: ['display', 700],
  subtitle: ['display', 600],
  heading: ['display', 600],
  default: ['body', 400],
  defaultBold: ['body', 600],
  small: ['body', 400],
  smallBold: ['body', 600],
  label: ['mono', 500],
  code: ['mono', 400],
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useAppTheme();
  const [role, weight] = FONTS[type];
  const color = theme.colors[themeColor ?? (type === 'label' ? 'label' : 'text')];

  return (
    <Text style={[{ color }, fontStyle(theme, role, weight), styles[type], style]} {...rest} />
  );
}

const styles = StyleSheet.create<Record<TextType, TextStyle>>({
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 30,
    lineHeight: 36,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 12,
    lineHeight: 16,
  },
});
