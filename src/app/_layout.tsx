import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { BRAND_FILES } from '@/constants/fonts';
import { fontStyle } from '@/constants/theme';
import { DatabaseProvider } from '@/db/database-provider';
import { SettingsProvider } from '@/hooks/use-settings';
import { AppThemeProvider, useAppTheme } from '@/hooks/use-theme';

// Kept up until the database, settings and fonts are ready, so the theme never flashes.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(BRAND_FILES);
  // A font that fails to load falls back to the system font rather than blocking the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <DatabaseProvider>
          <SettingsProvider>
            <AppThemeProvider>
              <ThemedNavigation />
            </AppThemeProvider>
          </SettingsProvider>
        </DatabaseProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

type NavigationTheme = ComponentProps<typeof ThemeProvider>['value'];

function ThemedNavigation() {
  const theme = useAppTheme();
  const { colors } = theme;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const base = theme.dark ? DarkTheme : DefaultTheme;
  const navigationTheme: NavigationTheme = {
    ...base,
    dark: theme.dark,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { ...fontStyle(theme, 'display', 600), fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
        {/* No navigation header: it draws its own bar (see voice-note.tsx). */}
        <Stack.Screen name="voice-note" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Event' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="custom-theme" options={{ title: 'Custom theme' }} />
        <Stack.Screen name="category/[id]" options={{ title: 'Category' }} />
        <Stack.Screen name="category-editor/[id]" options={{ title: 'Category' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
