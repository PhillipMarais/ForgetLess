import { NativeTabs } from 'expo-router/native-tabs';

import { Icons } from '@/components/icon';
import { TABS } from '@/components/tabs';
import { fontStyle } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useAppTheme();
  const { colors } = theme;
  const label = { ...fontStyle(theme, 'body', 500), fontSize: 12 };

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundSelected}
      iconColor={{ default: colors.textSecondary, selected: colors.accent }}
      labelVisibilityMode="labeled"
      labelStyle={{
        default: { ...label, color: colors.textSecondary },
        selected: { ...label, color: colors.text },
      }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={Icons[tab.icon].ios} md={Icons[tab.icon].material} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
