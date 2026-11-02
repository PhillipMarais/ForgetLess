import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { TABS } from '@/components/tabs';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Web stand-in for the native bottom tab bar, so the browser preview matches the phone layout. */
export default function AppTabs() {
  const theme = useTheme();

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList
        style={[styles.bar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabButton icon={tab.icon}>{tab.label}</TabButton>
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: keyof typeof Icons };

// `ref` is dropped: TabTrigger types it as View's class ref, which RN 0.88's Pressable rejects.
function TabButton({ children, isFocused, icon, ref: _ref, ...props }: TabButtonProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <View
        style={[styles.indicator, isFocused && { backgroundColor: theme.backgroundSelected }]}>
        <Icon name={Icons[icon]} size={22} color={isFocused ? 'text' : 'textSecondary'} />
      </View>
      <ThemedText
        type={isFocused ? 'smallBold' : 'small'}
        themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
  },
  tab: {
    flex: 1,
    maxWidth: MaxContentWidth / 4,
    alignItems: 'center',
    gap: Spacing.half,
  },
  indicator: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
