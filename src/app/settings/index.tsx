import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormTextInput } from '@/components/form';
import { SettingChoices, SettingSwitch, SettingsGroup, SettingsPage } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { SPEECH_LANGUAGES, speechLanguageName } from '@/constants/speech-languages';
import type { CalendarStartView } from '@/db/settings';
import { Spacing } from '@/constants/theme';
import { holidayRegionChoices, holidayRegionTitle, type HolidayRegion } from '@/lib/holidays';
import { useSettings } from '@/hooks/use-settings';

const START_VIEWS: { value: CalendarStartView; title: string; description: string }[] = [
  { value: 'recent', title: 'Last used', description: 'The view you had open last time.' },
  { value: 'day', title: 'Day', description: 'Today’s timeline.' },
  { value: 'week', title: 'Week', description: 'This week, day by day.' },
  { value: 'month', title: 'Month', description: 'The whole month at a glance.' },
];

export default function GeneralSettingsScreen() {
  const { settings, setSetting } = useSettings();
  const hold = settings.blockRepeatsUntilDone;
  const { taskDefaultDate: date, taskDefaultTime: time, taskDefaultAlarm: alarm } = settings;

  return (
    <SettingsPage>
      <SettingsGroup label="Tasks">
        <SettingSwitch
          title="Hold repeats until done"
          description={
            hold
              ? 'A missed repeating task stays overdue, and its next dates wait until you tick it off.'
              : 'A missed repeating task moves on to its next date by itself and never shows as overdue.'
          }
          value={hold}
          onChange={(value) => setSetting('blockRepeatsUntilDone', value)}
        />
        <SettingSwitch
          divided
          title="New tasks have a date"
          description={date ? 'New tasks start on today’s date.' : 'New tasks start without a date.'}
          value={date}
          onChange={(value) => setSetting('taskDefaultDate', value)}
        />
        <SettingSwitch
          divided
          title="…and a time"
          description={
            !date
              ? 'Turn on “New tasks have a date” first.'
              : time
                ? 'New tasks start at the next whole hour.'
                : 'New tasks are due some time that day.'
          }
          value={date && time}
          disabled={!date}
          onChange={(value) => setSetting('taskDefaultTime', value)}
        />
        <SettingSwitch
          divided
          title="…and an alarm"
          description={
            !date || !time
              ? 'Turn on “…and a time” first.'
              : alarm
                ? 'New tasks ring an alarm at their time.'
                : 'New tasks don’t ring.'
          }
          value={date && time && alarm}
          disabled={!date || !time}
          onChange={(value) => setSetting('taskDefaultAlarm', value)}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Calendar opens on"
        collapsible
        summary={START_VIEWS.find((view) => view.value === settings.calendarStartView)?.title}>
        <SettingChoices
          label="Calendar opens on"
          options={START_VIEWS}
          value={settings.calendarStartView}
          onChange={(value) => setSetting('calendarStartView', value)}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Public holidays"
        collapsible
        summary={holidayRegionTitle(settings.holidayRegion)}>
        <HolidayRegionPicker
          value={settings.holidayRegion}
          onChange={(value) => setSetting('holidayRegion', value)}
        />
      </SettingsGroup>

      <SettingsGroup
        label="Voice notes language"
        collapsible
        summary={speechLanguageName(settings.speechLanguage)}>
        <SettingChoices
          label="Voice notes language"
          options={SPEECH_LANGUAGES}
          value={settings.speechLanguage}
          onChange={(value) => setSetting('speechLanguage', value)}
        />
      </SettingsGroup>
    </SettingsPage>
  );
}

/** At most this many countries are listed for a search. */
const MAX_MATCHES = 25;

/**
 * Automatic (the phone's region) and None, then a search over every country. Without a
 * search only the chosen country is listed, so the page doesn't fill with 200 names.
 */
function HolidayRegionPicker({ value, onChange }: { value: HolidayRegion; onChange: (value: HolidayRegion) => void }) {
  const [query, setQuery] = useState('');
  const [all] = useState(holidayRegionChoices);
  const search = query.trim().toLowerCase();
  const [automatic, none, ...countries] = all;
  const shown = search
    ? countries.filter((country) => country.title.toLowerCase().includes(search)).slice(0, MAX_MATCHES)
    : countries.filter((country) => country.value === value);
  return (
    <View style={styles.picker}>
      <SettingChoices label="Public holidays" options={[automatic, none, ...shown]} value={value} onChange={onChange} />
      <FormTextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search for another country"
        accessibilityLabel="Search for a country"
        autoCorrect={false}
      />
      {search && shown.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No country matches “{query.trim()}”.
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: Spacing.two,
  },
});
