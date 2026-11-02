import { SettingChoices, SettingSwitch, SettingsGroup, SettingsPage } from '@/components/settings-row';
import type { CalendarStartView } from '@/db/settings';
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

      <SettingsGroup label="Calendar opens on">
        <SettingChoices
          label="Calendar opens on"
          options={START_VIEWS}
          value={settings.calendarStartView}
          onChange={(value) => setSetting('calendarStartView', value)}
        />
      </SettingsGroup>
    </SettingsPage>
  );
}
