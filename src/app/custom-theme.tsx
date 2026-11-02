import { Stack, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import ColorPicker, { HueSlider, InputWidget, Panel1, Swatches } from 'reanimated-color-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceDialog } from '@/components/choice-dialog';
import { HeaderTextButton, leaveEditor } from '@/components/editor';
import { Icon, Icons } from '@/components/icon';
import { ThemeSamplePager } from '@/components/theme-sample';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fontStyle, MaxContentWidth, Radius, Spacing, Themes } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { useAppTheme } from '@/hooks/use-theme';
import {
  buildCustomTheme,
  contrast,
  CUSTOM_COLOR_FIELDS,
  customColorsFrom,
  type CustomColors,
} from '@/lib/custom-theme';

/** Quick picks: the brand palette first, then a few common colours. */
const SWATCHES = [
  '#0D0D0E', '#17171A', '#141414', '#F2EFEA', '#F7F5F2', '#FFFFFF', '#A8A39C', '#57534D',
  '#FF6A13', '#FF8A3D', '#B54A00', '#FF4D5E', '#1E7CE8', '#4FA3F7', '#22A06B', '#8B5CF6',
  '#E11D74', '#F5B301',
];

type Field = keyof CustomColors;

/** Contrast problems worth pointing out, in plain words. */
function readabilityWarnings(c: CustomColors) {
  const warnings: string[] = [];
  if (contrast(c.text, c.background) < 4.5) warnings.push('Text is hard to read on the background.');
  if (contrast(c.text, c.surface) < 4.5) warnings.push('Text is hard to read on cards and fields.');
  if (contrast(c.textSecondary, c.background) < 3) warnings.push('Secondary text is very faint.');
  if (contrast(c.accent, c.background) < 1.5) warnings.push('The accent blends into the background.');
  return warnings;
}

/**
 * Edit the Custom theme's colours, with live examples (Today, Calendar, Edit task) at the
 * top that scroll with the page. Tapping a colour swaps the list for a picker; Done keeps the
 * colour. Nothing is saved until Save, which also switches the app to the Custom theme.
 */
export default function CustomThemeScreen() {
  const theme = useAppTheme();
  const { colors } = theme;
  const { settings, setSetting } = useSettings();
  const [draft, setDraft] = useState<CustomColors>(settings.customColors);
  const [editing, setEditing] = useState<Field | null>(null);
  // The colour being picked, kept apart from the draft until Done.
  const [picked, setPicked] = useState('');
  // The picker starts from this value and then reports changes; feeding every change back
  // into it while dragging would make it jitter.
  const [pickerStart, setPickerStart] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const blockedLeave = useRef<(() => void) | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  const preview = editing ? { ...draft, [editing]: picked } : draft;
  const changed = CUSTOM_COLOR_FIELDS.some(({ key }) => draft[key] !== settings.customColors[key]);
  const warnings = readabilityWarnings(preview);
  const editingField = CUSTOM_COLOR_FIELDS.find((field) => field.key === editing);

  usePreventRemove(changed && !leaving && !editing, ({ repeat }) => {
    blockedLeave.current = repeat;
    setAsking(true);
  });

  useEffect(() => {
    if (!leaving) return;
    const resume = blockedLeave.current;
    blockedLeave.current = null;
    if (resume) resume();
    else leaveEditor('/settings/theme');
  }, [leaving]);

  // Android back closes the picker first (without keeping the colour), then leaves.
  useEffect(() => {
    if (!editing) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setEditing(null);
      return true;
    });
    return () => subscription.remove();
  }, [editing]);

  const save = () => {
    setAsking(false);
    setSetting('customColors', draft);
    setSetting('theme', 'custom');
    setLeaving(true);
  };

  const open = (field: Field) => {
    setPickerStart(draft[field]);
    setPicked(draft[field]);
    setEditing(field);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const closePicker = (keep: boolean) => {
    if (keep && editing) setDraft((current) => ({ ...current, [editing]: picked }));
    setEditing(null);
  };

  const startFrom = (base: 'light' | 'dark') => setDraft(customColorsFrom(Themes[base].colors));

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen
        options={{
          title: 'Custom theme',
          headerRight: () => <HeaderTextButton label="Save" onPress={save} disabled={editing !== null} />,
        }}
      />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.fill}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemeSamplePager theme={buildCustomTheme(preview)} />

          {editing && editingField ? (
            <View style={[styles.editor, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.editorHeader}>
                <View style={[styles.swatch, { backgroundColor: picked, borderColor: colors.border }]} />
                <View style={styles.flex}>
                  <ThemedText type="defaultBold">{editingField.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {editingField.hint}
                  </ThemedText>
                </View>
                <ThemedText type="code" themeColor="textSecondary">
                  {picked}
                </ThemedText>
              </View>
              <ColorPicker
                key={`${editing}:${pickerStart}`}
                value={pickerStart}
                onChangeJS={({ hex }) => setPicked(hex.slice(0, 7).toUpperCase())}
                style={styles.picker}>
                <Panel1 style={styles.panel} />
                <HueSlider style={styles.slider} />
                <Swatches colors={SWATCHES} swatchStyle={styles.presetSwatch} />
                <InputWidget
                  formats={['HEX']}
                  disableAlphaChannel
                  iconColor={colors.textSecondary}
                  inputStyle={[
                    styles.hexInput,
                    fontStyle(theme, 'mono', 400),
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  inputTitleStyle={{ color: colors.textSecondary }}
                />
              </ColorPicker>
              <Warnings warnings={warnings} />
              <View style={styles.editorButtons}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => closePicker(false)}
                  style={({ pressed }) => [
                    styles.editorButton,
                    styles.outlined,
                    { borderColor: colors.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="defaultBold">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => closePicker(true)}
                  style={({ pressed }) => [
                    styles.editorButton,
                    { backgroundColor: colors.accent },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="defaultBold" themeColor="onAccent">
                    Done
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.startRow}>
                <ThemedText type="label" style={styles.flex}>
                  Start from
                </ThemedText>
                {(['light', 'dark'] as const).map((base) => (
                  <Pressable
                    key={base}
                    accessibilityRole="button"
                    accessibilityLabel={`Start from the ${base} theme`}
                    onPress={() => startFrom(base)}
                    style={({ pressed }) => [
                      styles.startButton,
                      { borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}>
                    <View
                      style={[
                        styles.startSwatch,
                        { backgroundColor: Themes[base].colors.background, borderColor: colors.border },
                      ]}
                    />
                    <ThemedText type="smallBold">{base === 'light' ? 'Light' : 'Dark'}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <View style={[styles.list, { backgroundColor: colors.backgroundElement }]}>
                {CUSTOM_COLOR_FIELDS.map(({ key, label, hint }, index) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}, ${draft[key]}`}
                    accessibilityHint="Opens the colour picker"
                    onPress={() => open(key)}
                    style={({ pressed }) => [
                      styles.fieldRow,
                      index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                      pressed && styles.pressed,
                    ]}>
                    <View style={[styles.swatch, { backgroundColor: draft[key], borderColor: colors.border }]} />
                    <View style={styles.flex}>
                      <ThemedText type="defaultBold">{label}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {hint}
                      </ThemedText>
                    </View>
                    <ThemedText type="code" themeColor="textSecondary">
                      {draft[key]}
                    </ThemedText>
                    <Icon name={Icons.next} size={18} color="textSecondary" />
                  </Pressable>
                ))}
              </View>

              <Warnings warnings={warnings} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <ChoiceDialog
        visible={asking}
        title="Your colours aren't saved yet."
        choices={[
          { label: 'Save and use them', value: 'save' as const },
          { label: 'Discard changes', value: 'discard' as const, destructive: true },
        ]}
        onChoose={(choice) => {
          if (choice === 'save') save();
          else {
            setAsking(false);
            setLeaving(true);
          }
        }}
        onCancel={() => setAsking(false)}
      />
    </ThemedView>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <View style={styles.warnings} accessibilityLiveRegion="polite">
      {warnings.map((warning) => (
        <View key={warning} style={styles.warning}>
          <Icon name={Icons.warning} size={16} color="danger" />
          <ThemedText type="small" themeColor="danger" style={styles.flex}>
            {warning}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  editor: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  editorButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  editorButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
  },
  outlined: {
    borderWidth: 1,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  startSwatch: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  list: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  picker: {
    gap: Spacing.three,
  },
  panel: {
    height: 180,
    borderRadius: Radius.medium,
  },
  slider: {
    borderRadius: Radius.pill,
  },
  presetSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 0,
  },
  hexInput: {
    borderWidth: 1,
    borderRadius: Radius.small,
  },
  warnings: {
    gap: Spacing.two,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
