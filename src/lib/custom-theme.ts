import { DARK_COLORS, makeTheme, type ColorTokens, type Theme } from '@/constants/theme';

/** The colours a user picks for a custom theme; the rest are worked out from these. */
export type CustomColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  label: string;
  danger: string;
  /** Lines between list rows and around cards. */
  border: string;
};

export const CUSTOM_COLOR_FIELDS: readonly { key: keyof CustomColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'Behind everything' },
  { key: 'surface', label: 'Cards & fields', hint: 'Notes, inputs, chips' },
  { key: 'text', label: 'Text', hint: 'Titles and body text' },
  { key: 'textSecondary', label: 'Secondary text', hint: 'Times, hints, previews' },
  { key: 'accent', label: 'Accent', hint: 'Buttons, checkboxes, today' },
  { key: 'label', label: 'Section labels', hint: 'SCHEDULE, OVERDUE…' },
  { key: 'danger', label: 'Warnings', hint: 'Overdue, delete' },
  { key: 'border', label: 'Divider lines', hint: 'Lines between rows and around cards' },
];

/** The starting point for a custom theme: the Dark theme's colours. */
export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  background: DARK_COLORS.background,
  surface: DARK_COLORS.backgroundElement,
  text: DARK_COLORS.text,
  textSecondary: DARK_COLORS.textSecondary,
  accent: DARK_COLORS.accent,
  label: DARK_COLORS.label,
  danger: DARK_COLORS.danger,
  border: DARK_COLORS.border,
};

/** Picks the user-facing colours out of a full theme, e.g. to start a custom theme from Light. */
export function customColorsFrom(colors: ColorTokens): CustomColors {
  return {
    background: colors.background,
    surface: colors.backgroundElement,
    text: colors.text,
    textSecondary: colors.textSecondary,
    accent: colors.accent,
    label: colors.label,
    danger: colors.danger,
    border: colors.border,
  };
}

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `amount` (0–1) of the way from colour `a` to colour `b`. */
export function mix(a: string, b: string, amount: number) {
  const [x, y] = [rgb(a), rgb(b)];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as [number, number, number]);
}

/** Fills in any missing or invalid colour from the defaults (stored settings may be partial). */
export function sanitizeCustomColors(value: unknown): CustomColors {
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_CUSTOM_COLORS };
  for (const { key } of CUSTOM_COLOR_FIELDS) {
    if (isHexColor(source[key])) result[key] = source[key].toUpperCase();
  }
  // Themes saved before divider lines could be picked: work them out as before.
  if (Object.keys(source).length > 0 && !isHexColor(source.border)) {
    result.border = mix(result.background, result.text, 0.15);
  }
  return result;
}

/**
 * Turns the picked colours into a full theme: whether it is dark, pressed and border shades,
 * readable text on the accent, a readable accent for text, and the header glow.
 */
export function buildCustomTheme(picked: CustomColors): Theme {
  const c = sanitizeCustomColors(picked);
  const dark = luminance(c.background) < 0.4;
  const ink = contrast(c.accent, '#141414') >= contrast(c.accent, '#FFFFFF') ? '#141414' : '#FFFFFF';
  // Accent text must stay readable on the background (WCAG 3:1 for large/bold UI text).
  let accentText = c.accent;
  for (let step = 1; contrast(accentText, c.background) < 3 && step <= 10; step++) {
    accentText = mix(c.accent, c.text, step / 10);
  }
  const [r, g, b] = rgb(c.accent);
  const colors: ColorTokens = {
    text: c.text,
    textSecondary: c.textSecondary,
    background: c.background,
    backgroundElement: c.surface,
    backgroundSelected: mix(c.surface, c.text, 0.1),
    border: c.border,
    accent: c.accent,
    onAccent: ink,
    accentText,
    danger: c.danger,
    label: c.label,
    glow: `rgba(${r}, ${g}, ${b}, ${dark ? 0.14 : 0.1})`,
  };
  return makeTheme(colors, dark);
}
