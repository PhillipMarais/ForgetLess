import { Themes } from '@/constants/theme';

import {
  buildCustomTheme,
  contrast,
  customColorsFrom,
  DEFAULT_CUSTOM_COLORS,
  luminance,
  mix,
  sanitizeCustomColors,
} from './custom-theme';

describe('colour helpers', () => {
  it('computes WCAG luminance and contrast', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#FFFFFF')).toBeCloseTo(1);
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1);
  });

  it('mixes colours', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix('#FF6A13', '#FF6A13', 0.3)).toBe('#FF6A13');
  });
});

describe('sanitizeCustomColors', () => {
  it('keeps valid colours (upper-cased) and replaces anything else with the default', () => {
    const result = sanitizeCustomColors({ accent: '#22a06b', text: 'red', background: 42 });
    expect(result.accent).toBe('#22A06B');
    expect(result.text).toBe(DEFAULT_CUSTOM_COLORS.text);
    expect(result.background).toBe(DEFAULT_CUSTOM_COLORS.background);
  });

  it('handles non-objects', () => {
    expect(sanitizeCustomColors(null)).toEqual(DEFAULT_CUSTOM_COLORS);
  });
});

describe('buildCustomTheme', () => {
  it('reproduces the Dark theme from its own colours', () => {
    const theme = buildCustomTheme(customColorsFrom(Themes.dark.colors));
    expect(theme.dark).toBe(true);
    expect(theme.colors.background).toBe(Themes.dark.colors.background);
    expect(theme.colors.onAccent).toBe('#141414');
  });

  it('detects light backgrounds', () => {
    expect(buildCustomTheme(customColorsFrom(Themes.light.colors)).dark).toBe(false);
  });

  it('puts readable text on the accent', () => {
    const dark = buildCustomTheme({ ...DEFAULT_CUSTOM_COLORS, accent: '#1A237E' });
    const light = buildCustomTheme({ ...DEFAULT_CUSTOM_COLORS, accent: '#FFE082' });
    expect(dark.colors.onAccent).toBe('#FFFFFF');
    expect(light.colors.onAccent).toBe('#141414');
  });

  it('darkens or lightens accent text until it is readable on the background', () => {
    // A pale yellow accent on a white background is unreadable as text.
    const theme = buildCustomTheme({
      ...customColorsFrom(Themes.light.colors),
      background: '#FFFFFF',
      accent: '#FFE082',
    });
    expect(theme.colors.accent).toBe('#FFE082');
    expect(contrast(theme.colors.accentText, '#FFFFFF')).toBeGreaterThanOrEqual(3);
  });
});
