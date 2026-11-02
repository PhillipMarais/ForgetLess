import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { FONT_SETS, isFontSetLoaded, loadFontSet } from '@/constants/fonts';
import { CONTROL_SIZES, TEXT_SIZES, Themes, withFonts, withSizes, type Theme } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { buildCustomTheme } from '@/lib/custom-theme';

const ThemeContext = createContext<Theme>(Themes.light);

/**
 * Picks the theme from the Theme setting ("system" follows the phone's light/dark mode) and
 * the chosen font set, which keeps the brand fonts until its files have loaded.
 */
export function AppThemeProvider({ children }: PropsWithChildren<object>) {
  const { settings } = useSettings();
  const scheme = useColorScheme();
  const fontSet = settings.fontSet;
  const [loadedSet, setLoadedSet] = useState(() => (isFontSetLoaded(fontSet) ? fontSet : null));

  useEffect(() => {
    let active = true;
    loadFontSet(fontSet).then((ok) => active && ok && setLoadedSet(fontSet));
    return () => {
      active = false;
    };
  }, [fontSet]);

  const colors =
    settings.theme === 'custom'
      ? buildCustomTheme(settings.customColors)
      : Themes[settings.theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : settings.theme];
  const theme = withSizes(
    loadedSet === fontSet ? withFonts(colors, FONT_SETS[fontSet].families) : colors,
    TEXT_SIZES[settings.textSize].scale,
    CONTROL_SIZES[settings.controlSize].scale,
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The active theme: colours, fonts and whether it is dark. */
export function useAppTheme() {
  return useContext(ThemeContext);
}

/** A text size scaled by the Text size setting, for text that isn't a ThemedText (inputs). */
export function useFontSize(size: number) {
  return Math.round(size * useContext(ThemeContext).textScale);
}

/** A button or control dimension scaled by the Button size setting. */
export function useControlSize(size: number) {
  return Math.round(size * useContext(ThemeContext).controlScale);
}

/** Shortcut for the active theme's colours. */
export function useTheme() {
  return useContext(ThemeContext).colors;
}

/** Renders its children in a given theme, e.g. to preview a theme that isn't active. */
export function ThemeScope({ theme, children }: PropsWithChildren<{ theme: Theme }>) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
