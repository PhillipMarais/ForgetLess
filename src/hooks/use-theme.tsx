import { createContext, useContext, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { Themes, type Theme } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';

const ThemeContext = createContext<Theme>(Themes.light);

/** Picks the theme from the Theme setting; "system" follows the phone's light/dark mode. */
export function AppThemeProvider({ children }: PropsWithChildren<object>) {
  const { settings } = useSettings();
  const scheme = useColorScheme();
  const name =
    settings.theme === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : settings.theme;
  return <ThemeContext.Provider value={Themes[name]}>{children}</ThemeContext.Provider>;
}

/** The active theme: colours, fonts and whether it is dark. */
export function useAppTheme() {
  return useContext(ThemeContext);
}

/** Shortcut for the active theme's colours. */
export function useTheme() {
  return useContext(ThemeContext).colors;
}
