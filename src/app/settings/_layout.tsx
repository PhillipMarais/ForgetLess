import { Tabs } from 'expo-router';

import { Icon, Icons } from '@/components/icon';
import { fontStyle } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

/** Settings has its own bottom bar, one tab per settings area. Add new areas here. */
export default function SettingsLayout() {
  const theme = useAppTheme();
  const { colors } = theme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { ...fontStyle(theme, 'body', 500), fontSize: 12 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'General',
          tabBarIcon: ({ focused }) => (
            <Icon name={Icons.general} size={22} color={focused ? 'accent' : 'textSecondary'} />
          ),
        }}
      />
      <Tabs.Screen
        name="theme"
        options={{
          title: 'Theme',
          tabBarIcon: ({ focused }) => (
            <Icon name={Icons.theme} size={22} color={focused ? 'accent' : 'textSecondary'} />
          ),
        }}
      />
    </Tabs>
  );
}
