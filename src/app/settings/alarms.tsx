import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlarmPermissionWarnings, requestAlarmPermission, useAlarmPermissions } from '@/components/alarm-field';
import { ChipGroup } from '@/components/chip';
import { Icon, Icons } from '@/components/icon';
import { SettingSwitch, SettingsGroup, SettingsPage } from '@/components/settings-row';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SNOOZE_CHOICES } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { ForgetlessDevice, type AlarmSound } from '@/lib/device';

const SNOOZE_OPTIONS = SNOOZE_CHOICES.map((minutes) => ({ label: `${minutes} min`, value: minutes }));

/** How alarms on tasks and events ring: sound, vibration and snooze length. */
export default function AlarmSettingsScreen() {
  const { settings, setSetting } = useSettings();
  const theme = useTheme();
  const device = ForgetlessDevice;
  const { permissions, refresh } = useAlarmPermissions(true);
  const [sounds] = useState<AlarmSound[]>(() => device?.alarmSounds() ?? []);
  const [choosing, setChoosing] = useState(false);
  const [playing, setPlaying] = useState<string | null | undefined>(undefined);

  useEffect(() => () => device?.stopPreview(), [device]);

  const preview = (uri: string | null) => {
    if (!device) return;
    if (playing === uri) {
      device.stopPreview();
      setPlaying(undefined);
    } else {
      device.previewSound(uri);
      setPlaying(uri);
    }
  };

  const choose = (sound: { title: string; uri: string | null }) => {
    setSetting('alarmSoundUri', sound.uri);
    setSetting('alarmSoundName', sound.title);
    preview(sound.uri);
  };

  const testAlarm = async () => {
    device?.stopPreview();
    setPlaying(undefined);
    await requestAlarmPermission();
    refresh();
    device?.testAlarm('Test alarm', 'This is how your alarms ring. Tap Dismiss to stop it.');
  };

  if (!device) {
    return (
      <SettingsPage>
        <SettingsGroup label="Alarms">
          <ThemedText style={styles.padded} themeColor="textSecondary">
            Alarms ring on your phone. Open Forgetless on your phone to choose the sound.
          </ThemedText>
        </SettingsGroup>
      </SettingsPage>
    );
  }

  const options: { title: string; uri: string | null }[] = [{ title: 'Phone default', uri: null }, ...sounds];

  return (
    <SettingsPage>
      <AlarmPermissionWarnings permissions={permissions} />

      <SettingsGroup label="Sound">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: choosing }}
          onPress={() => setChoosing(!choosing)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <Icon name={Icons.sound} size={22} color="accentText" />
          <View style={styles.flex}>
            <ThemedText type="defaultBold">Alarm sound</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {settings.alarmSoundName}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" themeColor="accentText">
            {choosing ? 'Done' : 'Change'}
          </ThemedText>
        </Pressable>
        {choosing
          ? options.map((sound) => {
              const selected = sound.uri === settings.alarmSoundUri;
              return (
                <View
                  key={sound.uri ?? 'default'}
                  style={[styles.soundRow, { borderTopColor: theme.border }]}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => choose(sound)}
                    style={({ pressed }) => [styles.soundChoice, pressed && styles.pressed]}>
                    <View style={[styles.radio, { borderColor: selected ? theme.accent : theme.textSecondary }]}>
                      {selected ? <View style={[styles.radioDot, { backgroundColor: theme.accent }]} /> : null}
                    </View>
                    <ThemedText style={styles.flex} numberOfLines={1}>
                      {sound.title}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={playing === sound.uri ? `Stop ${sound.title}` : `Play ${sound.title}`}
                    onPress={() => preview(sound.uri)}
                    hitSlop={Spacing.two}
                    style={({ pressed }) => [styles.play, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
                    <Icon name={playing === sound.uri ? Icons.stop : Icons.play} size={18} color="text" />
                  </Pressable>
                </View>
              );
            })
          : null}
      </SettingsGroup>

      <SettingsGroup label="Ringing">
        <SettingSwitch
          title="Vibrate"
          description={settings.alarmVibrate ? 'The phone vibrates while an alarm rings.' : 'Alarms only play a sound.'}
          value={settings.alarmVibrate}
          onChange={(value) => setSetting('alarmVibrate', value)}
        />
        <View style={[styles.snooze, { borderTopColor: theme.border }]}>
          <ThemedText type="defaultBold">Snooze for</ThemedText>
          <ChipGroup
            label="Snooze length"
            options={SNOOZE_OPTIONS}
            value={settings.alarmSnoozeMinutes}
            onChange={(value) => setSetting('alarmSnoozeMinutes', value)}
          />
        </View>
      </SettingsGroup>

      <Pressable
        accessibilityRole="button"
        onPress={testAlarm}
        style={({ pressed }) => [styles.test, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
        <Icon name={Icons.alarm} size={22} color="onAccent" />
        <ThemedText type="defaultBold" themeColor="onAccent">
          Ring a test alarm
        </ThemedText>
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Turn on an alarm in a task or event that has a time. Alarms ring even when the phone is
        locked or Forgetless is closed, and keep ringing until you dismiss or snooze them.
      </ThemedText>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingRight: Spacing.three,
  },
  soundChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.three,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  play: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snooze: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  test: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
  },
  note: {
    paddingHorizontal: Spacing.one,
  },
});
