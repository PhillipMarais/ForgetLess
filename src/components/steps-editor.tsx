import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { fontStyle, Radius, Spacing } from '@/constants/theme';
import type { StepDraft } from '@/db/steps';
import { useAppTheme, useControlSize, useFontSize } from '@/hooks/use-theme';

type StepsEditorProps = {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
};

/** Keys for steps not saved yet, so their text fields keep focus while the list changes. */
let nextKey = 0;
const keyOf = (step: StepDraft) => step.key ?? step.id ?? '';

/**
 * The task editor's step list: one text field per step, a remove button on each, and
 * "Add step". Pressing enter in the last step adds the next one.
 */
export function StepsEditor({ steps, onChange }: StepsEditorProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const fontSize = useFontSize(16);
  const addPadding = useControlSize(Spacing.two);
  // The step added last gets the keyboard.
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const add = () => {
    const key = `new-${nextKey++}`;
    onChange([...steps, { id: null, key, title: '', doneAt: null }]);
    setFocusKey(key);
  };

  const change = (index: number, title: string) =>
    onChange(steps.map((step, i) => (i === index ? { ...step, title } : step)));

  const remove = (index: number) => onChange(steps.filter((_, i) => i !== index));

  return (
    <View style={styles.list}>
      {steps.map((step, index) => {
        const key = keyOf(step);
        const done = step.doneAt !== null;
        return (
          <View key={key} style={[styles.row, { backgroundColor: colors.backgroundElement }]}>
            <View
              style={[
                styles.bullet,
                { borderColor: done ? colors.accent : colors.textSecondary },
                done && { backgroundColor: colors.accent },
              ]}>
              {done ? <Icon name={Icons.check} size={12} color="onAccent" /> : null}
            </View>
            <TextInput
              value={step.title}
              onChangeText={(title) => change(index, title)}
              placeholder={`Step ${index + 1}`}
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={`Step ${index + 1}`}
              autoFocus={key === focusKey}
              returnKeyType={index === steps.length - 1 ? 'next' : 'done'}
              submitBehavior={index === steps.length - 1 ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={() => {
                if (index === steps.length - 1 && step.title.trim()) add();
              }}
              style={[
                styles.input,
                fontStyle(theme, 'body', 400),
                { color: colors.text, fontSize },
                done && styles.struck,
              ]}
            />
            <IconButton
              icon={Icons.close}
              label={`Remove step ${index + 1}`}
              color="textSecondary"
              onPress={() => remove(index)}
            />
          </View>
        );
      })}
      <Pressable
        accessibilityRole="button"
        onPress={add}
        style={({ pressed }) => [
          styles.add,
          { borderColor: colors.accentText, paddingVertical: addPadding },
          pressed && styles.pressed,
        ]}>
        <Icon name={Icons.add} size={20} color="accentText" />
        <ThemedText type="smallBold" themeColor="accentText">
          Add step
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingLeft: Spacing.three,
  },
  bullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
