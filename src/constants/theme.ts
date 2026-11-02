/**
 * Design tokens. Each theme defines the same colour roles and a font set, so components
 * never hard-code colours or fonts: they ask the active theme (see `useAppTheme`).
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export type ThemeName = 'light' | 'dark' | 'original';

export type ColorTokens = {
  text: string;
  textSecondary: string;
  background: string;
  /** Cards, inputs, chips. */
  backgroundElement: string;
  /** Pressed / selected elements. */
  backgroundSelected: string;
  border: string;
  accent: string;
  /** Text and icons drawn on top of `accent`. */
  onAccent: string;
  danger: string;
  /** Small uppercase section labels. */
  label: string;
  /** Top-of-screen glow behind headers; transparent for themes without one. */
  glow: string;
};

export type ThemeColor = keyof ColorTokens;

export type FontRole = 'display' | 'body' | 'mono';
export type FontWeight = 400 | 500 | 600 | 700;

type FontFamilies = Record<FontRole, Record<FontWeight, string>>;

export type Theme = {
  name: ThemeName;
  label: string;
  dark: boolean;
  colors: ColorTokens;
  /** Custom font files per role and weight; null uses the platform's system font. */
  fonts: FontFamilies | null;
};

const LIGHT: ColorTokens = {
  text: '#111113',
  textSecondary: '#60646C',
  background: '#FFFFFF',
  backgroundElement: '#F2F2F5',
  backgroundSelected: '#E4E5EA',
  border: '#E0E1E6',
  accent: '#1E7CE8',
  onAccent: '#FFFFFF',
  danger: '#D93D42',
  label: '#60646C',
  glow: 'transparent',
};

const DARK: ColorTokens = {
  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  background: '#0F0F10',
  backgroundElement: '#1C1C1F',
  backgroundSelected: '#2A2B30',
  border: '#2E2F34',
  accent: '#4FA3F7',
  onAccent: '#0F0F10',
  danger: '#FF6369',
  label: '#A1A1AA',
  glow: 'transparent',
};

/** The dark look of phillipmarais.github.io: near-black, warm off-white, signal orange. */
const ORIGINAL: ColorTokens = {
  text: '#F2EFEA',
  textSecondary: '#A8A39C',
  background: '#0D0D0E',
  backgroundElement: '#17171A',
  backgroundSelected: '#24221F',
  border: '#2A2724',
  accent: '#FF6A13',
  onAccent: '#141414',
  danger: '#FF4D5E',
  label: '#FF8A3D',
  glow: 'rgba(255, 106, 19, 0.14)',
};

const ORIGINAL_FONTS: FontFamilies = {
  display: {
    400: 'ChakraPetch_500Medium',
    500: 'ChakraPetch_500Medium',
    600: 'ChakraPetch_600SemiBold',
    700: 'ChakraPetch_700Bold',
  },
  body: {
    400: 'IBMPlexSans_400Regular',
    500: 'IBMPlexSans_500Medium',
    600: 'IBMPlexSans_600SemiBold',
    700: 'IBMPlexSans_700Bold',
  },
  mono: {
    400: 'IBMPlexMono_400Regular',
    500: 'IBMPlexMono_500Medium',
    600: 'IBMPlexMono_500Medium',
    700: 'IBMPlexMono_500Medium',
  },
};

export const Themes: Record<ThemeName, Theme> = {
  light: { name: 'light', label: 'Light', dark: false, colors: LIGHT, fonts: null },
  dark: { name: 'dark', label: 'Dark', dark: true, colors: DARK, fonts: null },
  original: { name: 'original', label: 'Original', dark: true, colors: ORIGINAL, fonts: ORIGINAL_FONTS },
};

const SYSTEM_FONTS: Record<FontRole, string | undefined> = {
  display: undefined,
  body: undefined,
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

/**
 * Font style for a role and weight. Custom fonts ship one file per weight, so the weight is
 * picked by family name (Android would otherwise fake bold); system fonts use fontWeight.
 */
export function fontStyle(theme: Theme, role: FontRole, weight: FontWeight): TextStyle {
  if (theme.fonts) return { fontFamily: theme.fonts[role][weight] };
  return { fontFamily: SYSTEM_FONTS[role], fontWeight: String(weight) as TextStyle['fontWeight'] };
}

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export const MaxContentWidth = 800;

/** Window width from which layouts use two columns (landscape phones, tablets). */
export const WideLayoutMinWidth = 700;
