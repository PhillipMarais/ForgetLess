import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipGroup } from '@/components/chip';
import { ClearTextButton } from '@/components/clear-text-button';
import { DictationButton } from '@/components/dictation-button';
import { KEYBOARD_GAP, leaveEditor } from '@/components/editor';
import { Icons } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fontStyle, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { listCategories } from '@/db/categories';
import { createNote } from '@/db/notes';
import { useLiveQuery } from '@/db/use-live-query';
import { appendSentence, useDictation } from '@/hooks/use-dictation';
import { useAppTheme, useControlSize, useFontSize } from '@/hooks/use-theme';
import { voiceNoteTitle } from '@/lib/dates';
import { ForgetlessDevice } from '@/lib/device';

/**
 * A quick spoken note, opened by the Voice note widget (`from=widget`) or the Notes widget's
 * mic. It pings and starts listening at once; the title is the date and time until you tap
 * it. Save files it under Voice notes (or a chosen category); from a widget the app then goes
 * back to the home screen.
 *
 * It draws its own top bar instead of the navigation header: opening it again from a widget
 * while the last one was still closing made the header's buttons crash.
 */
export default function VoiceNoteScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromWidget = from === 'widget';
  const db = useSQLiteContext();
  const theme = useAppTheme();
  const { colors } = theme;
  const titleSize = useFontSize(24);
  const bodySize = useFontSize(16);
  const saveHeight = useControlSize(52);
  const [defaultTitle] = useState(() => voiceNoteTitle());
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: categories = [] } = useLiveQuery(['note_categories'], 'categories', listCategories);
  const dictation = useDictation((sentence) => setBody((current) => appendSentence(current, sentence)));
  const canSave = body.trim().length > 0 && !saving;

  // Start listening straight away (after the ping).
  useEffect(() => {
    dictation.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (dictation.listening) dictation.stop();
    leaveEditor('/notes');
    // From a widget: back to the home screen, once the screen has finished closing.
    if (fromWidget) setTimeout(() => ForgetlessDevice?.moveToBack(), 450);
  };

  const save = async () => {
    setSaving(true);
    if (dictation.listening) dictation.stop();
    await createNote(db, { title: title.trim() || defaultTitle, body: body.trim(), categoryId, voice: true });
    close();
  };

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.fill}>
        <View style={styles.bar}>
          <IconButton icon={Icons.close} label="Close without saving" onPress={close} />
          <ThemedText type="heading" style={styles.barTitle}>
            Voice note
          </ThemedText>
        </View>
        <KeyboardAwareScrollView
          bottomOffset={KEYBOARD_GAP}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <TextInput
            value={title}
            onChangeText={setTitle}
            // The date and time is only a stand-in: tapping the title clears it to type your own.
            onFocus={() => {
              if (title === defaultTitle) setTitle('');
            }}
            onBlur={() => {
              if (!title.trim()) setTitle(defaultTitle);
            }}
            placeholder="Title"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Note title"
            style={[styles.title, fontStyle(theme, 'display', 600), { color: colors.text, fontSize: titleSize }]}
          />
          {categories.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="label">Category</ThemedText>
              <ChipGroup
                label="Category"
                options={[
                  { label: 'Voice notes', value: null },
                  ...categories.map((category) => ({ label: category.name, value: category.id as string | null })),
                ]}
                value={categoryId}
                onChange={setCategoryId}
              />
            </View>
          ) : null}
          <DictationButton
            listening={dictation.listening}
            partial={dictation.partial}
            error={dictation.error}
            onStart={dictation.start}
            onStop={dictation.stop}
            label="Speak"
            languageName={dictation.languageName}
          />
          <View style={styles.clearRow}>
            <ClearTextButton text={body} onChange={setBody} what="Note text" />
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What you say appears here. You can also type."
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Note text"
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            style={[
              styles.body,
              fontStyle(theme, 'body', 400),
              {
                color: colors.text,
                backgroundColor: colors.backgroundElement,
                fontSize: bodySize,
                lineHeight: Math.round(bodySize * 1.5),
              },
            ]}
          />
        </KeyboardAwareScrollView>
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={save}
            style={({ pressed }) => [
              styles.save,
              { backgroundColor: colors.accent, minHeight: saveHeight },
              (!canSave || pressed) && styles.dimmed,
            ]}>
            <ThemedText type="defaultBold" themeColor="onAccent">
              Save voice note
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  barTitle: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    paddingVertical: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  clearRow: {
    alignItems: 'flex-end',
    marginBottom: -Spacing.two,
  },
  body: {
    minHeight: 200,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
  },
  save: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  dimmed: {
    opacity: 0.5,
  },
});
