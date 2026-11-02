import { router } from 'expo-router';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { SettingsGroup, SettingsPage } from '@/components/settings-row';
import { ThemeSample } from '@/components/theme-sample';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Themes, type Theme } from '@/constants/theme';
import type { ThemeSetting } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { buildCustomTheme } from '@/lib/custom-theme';

const OPTIONS: { value: ThemeSetting; title: string; description: string }[] = [
  { value: 'system', title: 'Match phone', description: 'Light or Dark, following your phone.' },
  { value: 'light', title: 'Light', description: 'Warm paper with signal orange.' },
  { value: 'dark', title: 'Dark', description: 'Near-black with signal orange.' },
  { value: 'custom', title: 'Custom', description: 'Your own colours.' },
];

export default function ThemeSettingsScreen() {
  const { settings, setSetting } = useSettings();
  const scheme = useColorScheme();
  const colors = useTheme();

  const previewFor = (value: ThemeSetting): Theme => {
    if (value === 'custom') return buildCustomTheme(settings.customColors);
    if (value === 'system') return Themes[scheme === 'dark' ? 'dark' : 'light'];
    return Themes[value];
  };

  return (
    <SettingsPage>
      <SettingsGroup label="Theme">
        <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Theme">
          {OPTIONS.map((option) => (
            <ThemeCard
              key={option.value}
              title={option.title}
              description={option.description}
              preview={previewFor(option.value)}
              selected={settings.theme === option.value}
              onPress={() => setSetting('theme', option.value)}
            />
          ))}
        </View>
      </SettingsGroup>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/custom-theme')}
        style={({ pressed }) => [
          styles.editButton,
          { backgroundColor: colors.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <Icon name={Icons.theme} size={22} color="accentText" />
        <View style={styles.editText}>
          <ThemedText type="defaultBold">Edit custom colours</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Pick the colour of the background, text, buttons and more.
          </ThemedText>
        </View>
        <Icon name={Icons.next} size={22} color="textSecondary" />
      </Pressable>
    </SettingsPage>
  );
}

type ThemeCardProps = {
  title: string;
  description: string;
  preview: Theme;
  selected: boolean;
  onPress: () => void;
};

function ThemeCard({ title, description, preview, selected, onPress }: ThemeCardProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: selected ? colors.accent : colors.border },
        pressed && styles.pressed,
      ]}>
      <ThemeSample theme={preview} compact />
      <View style={styles.cardText}>
        <View style={styles.titleRow}>
          <ThemedText type="defaultBold" style={styles.flex}>
            {title}
          </ThemedText>
          {selected ? <Icon name={Icons.check} size={18} color="accentText" /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  card: {
    flexGrow: 1,
    flexBasis: 140,
    maxWidth: 260,
    borderWidth: 2,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
  cardText: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
  },
  editText: {
    flex: 1,
    gap: Spacing.half,
  },
});
