import { PermissionsAndroid, Platform } from 'react-native';

import { clearPhoneHolidayCache } from './holidays';

const READ_CALENDAR = 'android.permission.READ_CALENDAR';

/** Whether the app may read the phone's calendars (for its holiday calendar). */
export async function hasCalendarAccess() {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(READ_CALENDAR);
}

/** Asks for calendar access; true when given. */
export async function askCalendarAccess() {
  if (Platform.OS !== 'android') return false;
  const granted = (await PermissionsAndroid.request(READ_CALENDAR)) === PermissionsAndroid.RESULTS.GRANTED;
  if (granted) clearPhoneHolidayCache();
  return granted;
}
