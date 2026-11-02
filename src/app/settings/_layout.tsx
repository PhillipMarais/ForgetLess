import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Icons } from '@/components/icon';
import { fontStyle } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

/** Settings has its own bottom bar, one tab per settings area. Add new areas here. */
export default function SettingsLayout() {
  const theme = useAppTheme();
  const { colors } = theme;
  // Sized from the phone's real bottom inset so the bar always sits above Android's own
  // navigation buttons (the app draws edge to edge).
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { ...fontStyle(theme, 'body', 500), fontSize: 12 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'General',
          tabBarIcon: ({ focused }) => (
            <Icon name={Icons.general} size={22} color={focused ? 'accentText' : 'textSecondary'} />
          ),
        }}
      />
      <Tabs.Screen
        name="theme"
        options={{
          title: 'Theme',
          tabBarIcon: ({ focused }) => (
            <Icon name={Icons.theme} size={22} color={focused ? 'accentText' : 'textSecondary'} />
          ),
        }}
      />
    </Tabs>
  );
}
