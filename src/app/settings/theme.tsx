import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { SettingChoices, SettingsGroup, SettingsPage } from '@/components/settings-row';
import { ThemeSample } from '@/components/theme-sample';
import { ThemedText } from '@/components/themed-text';
import { FONT_SET_IDS, FONT_SETS, isFontSetLoaded, loadFontSet, type FontSetId } from '@/constants/fonts';
import {
  CONTROL_SIZES,
  Radius,
  Spacing,
  TEXT_SIZES,
  Themes,
  withFonts,
  withSizes,
  type ControlSize,
  type TextSize,
  type Theme,
} from '@/constants/theme';
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
      <SettingsGroup
        label="Theme"
        collapsible
        summary={OPTIONS.find((option) => option.value === settings.theme)?.title}>
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

      <SettingsGroup label="Font" collapsible summary={FONT_SETS[settings.fontSet].label}>
        <FontChoices value={settings.fontSet} onChange={(fontSet) => setSetting('fontSet', fontSet)} />
      </SettingsGroup>

      <SettingsGroup label="Text size" collapsible summary={TEXT_SIZES[settings.textSize].label}>
        <SettingChoices
          label="Text size"
          options={TEXT_SIZE_OPTIONS}
          value={settings.textSize}
          onChange={(value) => setSetting('textSize', value)}
          preview={(value) => <TextSizeExample size={value} />}
        />
      </SettingsGroup>

      <SettingsGroup label="Button size" collapsible summary={CONTROL_SIZES[settings.controlSize].label}>
        <SettingChoices
          label="Button size"
          options={CONTROL_SIZE_OPTIONS}
          value={settings.controlSize}
          onChange={(value) => setSetting('controlSize', value)}
          preview={(value) => <ButtonSizeExample size={value} />}
        />
      </SettingsGroup>
    </SettingsPage>
  );
}

const TEXT_SIZE_OPTIONS = (Object.keys(TEXT_SIZES) as TextSize[]).map((value) => ({
  value,
  title: TEXT_SIZES[value].label,
}));

const CONTROL_SIZE_OPTIONS = (Object.keys(CONTROL_SIZES) as ControlSize[]).map((value) => ({
  value,
  title: CONTROL_SIZES[value].label,
}));

/** A task title and time at `size`, the way they'd look in a list. */
function TextSizeExample({ size }: { size: TextSize }) {
  const theme = useAppTheme();
  return (
    <ThemeScope theme={withSizes(theme, TEXT_SIZES[size].scale, theme.controlScale)}>
      <View style={styles.example} aria-hidden>
        <ThemedText type="defaultBold" numberOfLines={1}>
          Buy milk
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          Today 17:00
        </ThemedText>
      </View>
    </ThemeScope>
  );
}

/** A tick box and an "Add" button at `size`. */
function ButtonSizeExample({ size }: { size: ControlSize }) {
  const theme = useAppTheme();
  const scale = CONTROL_SIZES[size].scale;
  const box = Math.round(26 * scale);
  return (
    <View style={styles.buttonExample} aria-hidden>
      <View style={[styles.exampleBox, { width: box, height: box, borderRadius: box / 2, borderColor: theme.colors.accent }]} />
      <View
        style={[
          styles.exampleButton,
          {
            backgroundColor: theme.colors.accent,
            paddingHorizontal: Math.round(Spacing.three * scale),
            paddingVertical: Math.round(Spacing.two * scale),
          },
        ]}>
        <ThemedText type="smallBold" themeColor="onAccent">
          Add
        </ThemedText>
      </View>
    </View>
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
  example: {
    alignItems: 'flex-end',
  },
  buttonExample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  exampleBox: {
    borderWidth: 2,
  },
  exampleButton: {
    borderRadius: Radius.pill,
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
