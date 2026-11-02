import { useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ChipGroup } from '@/components/chip';
import { FormSwitch } from '@/components/form';
import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { ALARM_OFFSETS } from '@/db/reminders';
import { useTheme } from '@/hooks/use-theme';
import { ForgetlessDevice, type AlarmPermissions } from '@/lib/device';

/** Asks for notification permission (Android 13+); alarms ring through a notification. */
export async function requestAlarmPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
}

/**
 * What Android currently allows, re-checked when the user comes back from settings.
 * Call `refresh` after asking for a permission in the app.
 */
export function useAlarmPermissions(watch: boolean) {
  const read = () => ForgetlessDevice?.alarmPermissions() ?? null;
  const [permissions, setPermissions] = useState<AlarmPermissions | null>(read);
  useEffect(() => {
    if (!watch || !ForgetlessDevice) return;
    const device = ForgetlessDevice;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setPermissions(device.alarmPermissions());
    });
    return () => subscription.remove();
  }, [watch]);
  return { permissions, refresh: () => setPermissions(read()) };
}

const PROBLEMS: { key: keyof AlarmPermissions; text: string }[] = [
  { key: 'notifications', text: 'Notifications are off for Forgetless, so alarms can’t ring.' },
  { key: 'exactAlarms', text: 'Alarms may ring a few minutes late until exact alarms are allowed.' },
  { key: 'fullScreen', text: 'Alarms can’t fill the lock screen until you allow it.' },
];

/** Lists what Android is blocking, each with a button to the right settings page. */
export function AlarmPermissionWarnings({ permissions }: { permissions: AlarmPermissions | null }) {
  const theme = useTheme();
  if (!permissions || !ForgetlessDevice) return null;
  const device = ForgetlessDevice;
  const problems = PROBLEMS.filter((problem) => !permissions[problem.key]);
  if (problems.length === 0) return null;
  return (
    <View style={styles.warnings}>
      {problems.map((problem) => (
        <View key={problem.key} style={[styles.warning, { backgroundColor: theme.backgroundSelected }]}>
          <Icon name={Icons.warning} size={18} color="danger" />
          <ThemedText type="small" style={styles.flex}>
            {problem.text}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => device.openAlarmSettings(problem.key)}
            style={({ pressed }) => [styles.fix, { borderColor: theme.accentText }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="accentText">
              Allow
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

type AlarmFieldProps = {
  /** Minutes before the time; null for no alarm. */
  value: number | null;
  onChange: (value: number | null) => void;
};

/** "Alarm" switch for an item with a time, then when it should ring. */
export function AlarmField({ value, onChange }: AlarmFieldProps) {
  const on = value !== null;
  const { permissions, refresh } = useAlarmPermissions(on);

  const toggle = async (next: boolean) => {
    onChange(next ? 0 : null);
    if (!next) return;
    await requestAlarmPermission();
    refresh();
  };

  return (
    <>
      <FormSwitch label="Alarm" value={on} onChange={toggle} />
      {on ? (
        <>
          <ChipGroup label="When the alarm rings" options={ALARM_OFFSETS} value={value} onChange={onChange} />
          {Platform.OS === 'web' ? (
            <ThemedText type="small" themeColor="textSecondary">
              Alarms ring on your phone, not in the browser preview.
            </ThemedText>
          ) : null}
          <AlarmPermissionWarnings permissions={permissions} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  warnings: {
    gap: Spacing.two,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    padding: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  fix: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
