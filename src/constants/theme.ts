/**
 * Design tokens. Each theme defines the same colour roles and a font set, so components
 * never hard-code colours or fonts: they ask the active theme (see `useAppTheme`).
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

import { BRAND_FONTS, type FontFamilies, type FontRole, type FontWeight } from './fonts';

export type ThemeName = 'light' | 'dark' | 'custom';

export type ColorTokens = {
  text: string;
  textSecondary: string;
  background: string;
  /** Cards, inputs, chips. */
  backgroundElement: string;
  /** Pressed / selected elements. */
  backgroundSelected: string;
  border: string;
  /** Fills: buttons, selected chips, checkboxes, indicators. */
  accent: string;
  /** Text and icons drawn on top of `accent`. */
  onAccent: string;
  /** Accent-coloured text and small icons on `background`; darker than `accent` on light themes. */
  accentText: string;
  danger: string;
  /** Small uppercase section labels. */
  label: string;
  /** Top-of-screen glow behind headers; transparent for themes without one. */
  glow: string;
};

export type ThemeColor = keyof ColorTokens;

export type { FontRole, FontWeight } from './fonts';

export type Theme = {
  name: ThemeName;
  label: string;
  dark: boolean;
  colors: ColorTokens;
  /** Custom font files per role and weight; null uses the platform's system font. */
  fonts: FontFamilies | null;
};

/**
 * Light and Dark are the two looks of phillipmarais.github.io (src/styles.css there):
 * warm paper or near-black, ink, and signal orange.
 */
const LIGHT: ColorTokens = {
  text: '#141414',
  textSecondary: '#57534D',
  background: '#F7F5F2',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#EDE7DF',
  border: '#E4DDD4',
  accent: '#FF6A13',
  onAccent: '#141414',
  accentText: '#B54A00',
  danger: '#C4282F',
  label: '#B54A00',
  glow: 'rgba(255, 106, 19, 0.10)',
};

const DARK: ColorTokens = {
  text: '#F2EFEA',
  textSecondary: '#A8A39C',
  background: '#0D0D0E',
  backgroundElement: '#17171A',
  backgroundSelected: '#24221F',
  border: '#2A2724',
  accent: '#FF6A13',
  onAccent: '#141414',
  accentText: '#FF8A3D',
  danger: '#FF4D5E',
  label: '#FF8A3D',
  glow: 'rgba(255, 106, 19, 0.14)',
};

export const LIGHT_COLORS = LIGHT;
export const DARK_COLORS = DARK;

export const Themes: Record<'light' | 'dark', Theme> = {
  light: { name: 'light', label: 'Light', dark: false, colors: LIGHT, fonts: BRAND_FONTS },
  dark: { name: 'dark', label: 'Dark', dark: true, colors: DARK, fonts: BRAND_FONTS },
};

/** `theme` with another font set (null: the phone's font). */
export function withFonts(theme: Theme, fonts: FontFamilies | null): Theme {
  return theme.fonts === fonts ? theme : { ...theme, fonts };
}

/** A theme from user-chosen colours (see lib/custom-theme for how the rest are derived). */
export function makeTheme(colors: ColorTokens, dark: boolean): Theme {
  return { name: 'custom', label: 'Custom', dark, colors, fonts: BRAND_FONTS };
}

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
