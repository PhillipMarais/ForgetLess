import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { Themes, type Theme } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { buildCustomTheme } from '@/lib/custom-theme';

const ThemeContext = createContext<Theme>(Themes.light);

/** Picks the theme from the Theme setting; "system" follows the phone's light/dark mode. */
export function AppThemeProvider({ children }: PropsWithChildren<object>) {
  const { settings } = useSettings();
  const scheme = useColorScheme();
  const theme =
    settings.theme === 'custom'
      ? buildCustomTheme(settings.customColors)
      : Themes[settings.theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : settings.theme];
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** The active theme: colours, fonts and whether it is dark. */
export function useAppTheme() {
  return useContext(ThemeContext);
}

/** Shortcut for the active theme's colours. */
export function useTheme() {
  return useContext(ThemeContext).colors;
}

/** Renders its children in a given theme, e.g. to preview a theme that isn't active. */
export function ThemeScope({ theme, children }: PropsWithChildren<{ theme: Theme }>) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
