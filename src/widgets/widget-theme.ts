import type { HexColor } from 'react-native-android-widget';

import { LOGO_PATHS, LOGO_VIEWBOX } from '@/constants/logo';
import { Themes, type ColorTokens } from '@/constants/theme';
import type { Settings } from '@/db/settings';
import { buildCustomTheme } from '@/lib/custom-theme';

/** The theme colours a widget uses; widgets take plain hex colours. */
export type WidgetColors = {
  background: HexColor;
  surface: HexColor;
  text: HexColor;
  textSecondary: HexColor;
  accent: HexColor;
  onAccent: HexColor;
  accentText: HexColor;
  border: HexColor;
  danger: HexColor;
};

function fromTokens(colors: ColorTokens): WidgetColors {
  return {
    background: colors.background as HexColor,
    surface: colors.backgroundElement as HexColor,
    text: colors.text as HexColor,
    textSecondary: colors.textSecondary as HexColor,
    accent: colors.accent as HexColor,
    onAccent: colors.onAccent as HexColor,
    accentText: colors.accentText as HexColor,
    border: colors.border as HexColor,
    danger: colors.danger as HexColor,
  };
}

/**
 * Colours for the phone's light and dark mode. "Match phone" follows the phone like the
 * app does; Light, Dark and Custom look the same in both.
 */
export function widgetPalettes(settings: Pick<Settings, 'theme' | 'customColors'>) {
  if (settings.theme === 'custom') {
    const custom = fromTokens(buildCustomTheme(settings.customColors).colors);
    return { light: custom, dark: custom };
  }
  if (settings.theme === 'light' || settings.theme === 'dark') {
    const fixed = fromTokens(Themes[settings.theme].colors);
    return { light: fixed, dark: fixed };
  }
  return { light: fromTokens(Themes.light.colors), dark: fromTokens(Themes.dark.colors) };
}

/** Fonts bundled for widgets (see the react-native-android-widget plugin in app.json). */
export const WidgetFonts = {
  display: 'ChakraPetch_700Bold',
  body: 'IBMPlexSans_400Regular',
  bodyBold: 'IBMPlexSans_600SemiBold',
} as const;

/** The "FL" monogram as an SVG string. */
export function logoSvg(colors: WidgetColors) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}">
<path d="${LOGO_PATHS.bar}" fill="${colors.accent}"/>
<path d="${LOGO_PATHS.f}" fill="${colors.text}"/>
<path d="${LOGO_PATHS.l}" fill="${colors.text}"/>
<path d="${LOGO_PATHS.foot}" fill="${colors.accent}"/>
</svg>`;
}

/** Small Material-style icons as SVG strings, in `color`. */
export const WidgetIcons = {
  add: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>`,
  mic: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z"/></svg>`,
  check: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`,
  circle: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${color}" stroke-width="2"/></svg>`,
  checked: (fill: string, tick: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${fill}"/><path fill="${tick}" d="M10 15.6 6.9 12.5l-1.2 1.2 4.3 4.3 8.5-8.5-1.2-1.2z"/></svg>`,
  previous: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>`,
  next: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>`,
  folder: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8z"/></svg>`,
  steps: (color: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 3"/></svg>`,
};
