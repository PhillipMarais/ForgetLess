import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Forgetless's own Android module (android/src/main/java/app/mts/forgetless/device).
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
};

export const ForgetlessDevice = requireOptionalNativeModule<ForgetlessDeviceModule>('ForgetlessDevice');
