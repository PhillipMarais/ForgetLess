import { SettingSwitch, SettingsGroup, SettingsPage } from '@/components/settings-row';
import { useSettings } from '@/hooks/use-settings';

export default function GeneralSettingsScreen() {
  const { settings, setSetting } = useSettings();
  const hold = settings.blockRepeatsUntilDone;

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
      </SettingsGroup>
    </SettingsPage>
  );
}
