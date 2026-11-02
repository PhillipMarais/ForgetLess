/**
 * Languages for speech to text (Settings → General → Voice notes). Google's speech service on
 * the phone understands these; 'phone' follows the phone's own language.
 */
export const SPEECH_LANGUAGES = [
  { value: 'phone', title: 'Phone language', description: 'Whatever language your phone is set to.' },
  { value: 'en-ZA', title: 'English (South Africa)' },
  { value: 'af-ZA', title: 'Afrikaans' },
  { value: 'zu-ZA', title: 'isiZulu' },
  { value: 'xh-ZA', title: 'isiXhosa' },
  { value: 'en-GB', title: 'English (UK)' },
  { value: 'en-US', title: 'English (US)' },
  { value: 'nl-NL', title: 'Nederlands' },
  { value: 'de-DE', title: 'Deutsch' },
  { value: 'fr-FR', title: 'Français' },
  { value: 'pt-PT', title: 'Português' },
  { value: 'es-ES', title: 'Español' },
] as const;

export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number]['value'];

export const SPEECH_LANGUAGE_VALUES: readonly string[] = SPEECH_LANGUAGES.map((language) => language.value);

/** The language code to listen in, e.g. "af-ZA". */
export function speechLocale(setting: SpeechLanguage) {
  if (setting !== 'phone') return setting;
  return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

/** "Afrikaans", for showing the choice next to the Speak button. */
export function speechLanguageName(setting: SpeechLanguage) {
  return SPEECH_LANGUAGES.find((language) => language.value === setting)?.title ?? setting;
}
