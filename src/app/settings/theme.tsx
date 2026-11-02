import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { SettingsGroup, SettingsPage } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { fontStyle, Radius, Spacing, Themes, type Theme } from '@/constants/theme';
import type { ThemeSetting } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { value: ThemeSetting; title: string; description: string }[] = [
  { value: 'system', title: 'Match phone', description: 'Light or dark, following your phone.' },
  { value: 'light', title: 'Light', description: 'Bright and clean.' },
  { value: 'dark', title: 'Dark', description: 'Easy on the eyes at night.' },
  { value: 'original', title: 'Original', description: 'Near-black with signal orange.' },
];

export default function ThemeSettingsScreen() {
  const { settings, setSetting } = useSettings();
  const scheme = useColorScheme();

  return (
    <SettingsPage>
      <SettingsGroup label="Theme">
        <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Theme">
          {OPTIONS.map((option) => {
            const preview =
              option.value === 'system'
                ? Themes[scheme === 'dark' ? 'dark' : 'light']
                : Themes[option.value];
            return (
              <ThemeCard
                key={option.value}
                title={option.title}
                description={option.description}
                preview={preview}
                selected={settings.theme === option.value}
                onPress={() => setSetting('theme', option.value)}
              />
            );
          })}
        </View>
      </SettingsGroup>
      <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
        Custom themes, where you pick each colour yourself, are coming later.
      </ThemedText>
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
  const theme = useTheme();
  const p = preview.colors;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: selected ? theme.accent : theme.border },
        pressed && styles.pressed,
      ]}>
      {/* A miniature screen drawn in the previewed theme's own colours and fonts. */}
      <View style={[styles.preview, { backgroundColor: p.background }]}>
        <View style={[styles.previewGlow, { backgroundColor: p.glow }]} />
        <Text style={[fontStyle(preview, 'mono', 500), styles.previewLabel, { color: p.label }]}>
          TODAY
        </Text>
        <Text style={[fontStyle(preview, 'display', 700), styles.previewTitle, { color: p.text }]}>
          Aa
        </Text>
        <View style={[styles.previewCard, { backgroundColor: p.backgroundElement }]}>
          <View style={[styles.previewDot, { backgroundColor: p.accent }]} />
          <View style={[styles.previewLine, { backgroundColor: p.textSecondary }]} />
        </View>
      </View>
      <View style={styles.cardText}>
        <View style={styles.titleRow}>
          <ThemedText type="defaultBold" style={styles.cardTitle}>
            {title}
          </ThemedText>
          {selected ? <Icon name={Icons.check} size={18} color="accent" /> : null}
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
  preview: {
    height: 104,
    padding: Spacing.two,
    gap: Spacing.half,
    overflow: 'hidden',
  },
  previewGlow: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: 140,
    height: 100,
    borderRadius: 70,
  },
  previewLabel: {
    fontSize: 9,
    letterSpacing: 1,
  },
  previewTitle: {
    fontSize: 22,
    lineHeight: 26,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.small,
    padding: Spacing.two,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewLine: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  cardText: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
  },
  footnote: {
    paddingHorizontal: Spacing.one,
  },
});
