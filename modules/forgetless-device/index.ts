import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * ForgetLess's own Android module (android/src/main/java/app/mts/forgetless/device).
 * Null on web and in tests, where alarms can't ring and PDFs are shown by the browser.
 */

export type NativeAlarm = {
  /** Stable per task or event occurrence, e.g. "task:<id>:<time>". */
  id: string;
  /** Epoch ms. */
  at: number;
  title: string;
  body: string;
};

export type AlarmConfig = {
  /** null is the phone's default alarm sound. */
  soundUri: string | null;
  vibrate: boolean;
  snoozeMinutes: number;
};

export type AlarmPermissions = {
  notifications: boolean;
  exactAlarms: boolean;
  /** Showing the alarm over the lock screen (Android 14+ asks separately). */
  fullScreen: boolean;
};

export type AlarmSound = { title: string; uri: string };

export type PdfPage = { uri: string; width: number; height: number };

/** An event from one of the phone's Google holiday calendars. */
export type PhoneHoliday = {
  title: string;
  /** Epoch ms; all-day events start at midnight UTC on their date. */
  begin: number;
  allDay: boolean;
  /** Google's calendars say "Public holiday" or "Observance". */
  description: string;
};

type ForgetlessDeviceModule = {
  setAlarms(alarms: NativeAlarm[], config: AlarmConfig): void;
  testAlarm(title: string, body: string): void;
  alarmPermissions(): AlarmPermissions;
  openAlarmSettings(which: keyof AlarmPermissions): void;
  alarmSounds(): AlarmSound[];
  previewSound(uri: string | null): void;
  stopPreview(): void;
  pdfPageCount(uri: string): Promise<number>;
  renderPdfPage(uri: string, index: number, width: number): Promise<PdfPage>;
  /** Holidays in the phone's Google holiday calendars within [from, to); empty without calendar access. */
  phoneHolidays(from: number, to: number): PhoneHoliday[];
  /** How round the home screen draws widgets' corners, in dp (0 before Android 12). */
  widgetCornerRadius(): number;
  /** A short beep, e.g. when a voice note starts listening. */
  playPing(): void;
  /** Sends the app to the background, like pressing Home. */
  moveToBack(): void;
  /** The app's theme colours (hex), for the alarm screen and the widgets' quick-add popups. */
  setAppearance(colors: AppearanceColors): void;
};

export type AppearanceColors = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  accent: string;
  onAccent: string;
  border: string;
  danger: string;
  dark: boolean;
};

export const ForgetlessDevice = requireOptionalNativeModule<ForgetlessDeviceModule>('ForgetlessDevice');
