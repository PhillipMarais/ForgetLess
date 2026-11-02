import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { SettingsGroup, SettingsPage } from '@/components/settings-row';
import { ThemeSample } from '@/components/theme-sample';
import { ThemedText } from '@/components/themed-text';
import { FONT_SET_IDS, FONT_SETS, isFontSetLoaded, loadFontSet, type FontSetId } from '@/constants/fonts';
import { Radius, Spacing, Themes, withFonts, type Theme } from '@/constants/theme';
import type { ThemeSetting } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { ThemeScope, useAppTheme, useTheme } from '@/hooks/use-theme';
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

      <SettingsGroup label="Font">
        <FontChoices value={settings.fontSet} onChange={(fontSet) => setSetting('fontSet', fontSet)} />
      </SettingsGroup>
    </SettingsPage>
  );
}

/** Every font set, each previewed in its own fonts once they have loaded. */
function FontChoices({ value, onChange }: { value: FontSetId; onChange: (id: FontSetId) => void }) {
  const theme = useAppTheme();
  const [loaded, setLoaded] = useState(() => FONT_SET_IDS.filter(isFontSetLoaded));

  useEffect(() => {
    let active = true;
    Promise.all(FONT_SET_IDS.map(async (id) => ((await loadFontSet(id)) ? id : null))).then(
      (ids) => active && setLoaded(ids.filter((id): id is FontSetId => id !== null)),
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Font">
      {FONT_SET_IDS.map((id, index) => {
        const set = FONT_SETS[id];
        const selected = id === value;
        const preview = loaded.includes(id) ? withFonts(theme, set.families) : theme;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${set.label}. ${set.description}`}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.fontRow,
              index > 0 && { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              selected && { backgroundColor: theme.colors.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemeScope theme={preview}>
              <View style={styles.flex}>
                <ThemedText type="heading">{set.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {set.description}
                </ThemedText>
                <ThemedText type="label">Tasks · 9:30</ThemedText>
              </View>
            </ThemeScope>
            {selected ? <Icon name={Icons.check} size={22} color="accentText" /> : null}
          </Pressable>
        );
      })}
    </View>
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
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  editText: {
    flex: 1,
    gap: Spacing.half,
  },
});
