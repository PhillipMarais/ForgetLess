import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';

import { speechLanguageName, speechLocale } from '@/constants/speech-languages';
import { useSettings } from '@/hooks/use-settings';
import { ForgetlessDevice } from '@/lib/device';

/** Restarts in a row without hearing anything before giving up (a broken recognizer). */
const MAX_QUIET_RESTARTS = 5;

/**
 * Speech to text with the phone's own speech recognition (free, no account), in the language
 * chosen in Settings → General → Voice notes. Each finished
 * sentence goes to `onText`; `partial` is the sentence still being spoken. Starting plays a
 * short ping so you know when to talk.
 *
 * It listens until Stop. The phone's recognizer can still end the session by itself when you
 * pause to think; it is then restarted at once, without a ping, so a pause never stops it.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  // True from Start until Stop (or an error), across the recognizer's own restarts.
  const wanted = useRef(false);
  const quietRestarts = useRef(0);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();
  const language = settings.speechLanguage;
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  const listen = () =>
    ExpoSpeechRecognitionModule.start({
      lang: speechLocale(language),
      interimResults: true,
      // Keeps listening through pauses until Stop (and mutes Android's own beeps).
      continuous: true,
      addsPunctuation: true,
    });

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setError(null);
  });
  useSpeechRecognitionEvent('end', () => {
    setPartial('');
    if (wanted.current && quietRestarts.current < MAX_QUIET_RESTARTS) {
      quietRestarts.current += 1;
      listen();
      return;
    }
    wanted.current = false;
    setListening(false);
  });
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript?.trim() ?? '';
    if (text) quietRestarts.current = 0;
    if (event.isFinal) {
      setPartial('');
      if (text) onTextRef.current(text);
    } else {
      setPartial(text);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    // Stopping, or a pause with no speech, isn't a problem worth showing.
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    // Anything else ends it for good.
    wanted.current = false;
    if (event.error === 'not-allowed') setError('Microphone access is off. Turn it on in your phone settings.');
    else if (event.error === 'network') setError('Speech needs an internet connection on this phone.');
    else if (event.error === 'language-not-supported') {
      setError(`${speechLanguageName(language)} isn’t available for speech on this phone. Pick another language in Settings → General.`);
    } else if (event.error === 'service-not-allowed') {
      setError('Speech to text isn’t available on this phone.');
    } else setError('Couldn’t hear that. Try again.');
  });

  // Stop listening when the screen closes.
  useEffect(
    () => () => {
      wanted.current = false;
      ExpoSpeechRecognitionModule.abort();
    },
    [],
  );

  const start = async () => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone access is off. Turn it on in your phone settings.');
      return;
    }
    wanted.current = true;
    quietRestarts.current = 0;
    setListening(true);
    ForgetlessDevice?.playPing();
    // Let the ping finish so it isn't picked up as speech.
    setTimeout(listen, 250);
  };

  const stop = () => {
    wanted.current = false;
    ExpoSpeechRecognitionModule.stop();
  };

  return { listening, partial, error, start, stop, languageName: speechLanguageName(language) };
}

/** Adds a dictated sentence to text, with a space or new line as needed. */
export function appendSentence(text: string, sentence: string) {
  const trimmed = text.replace(/\s+$/, '');
  if (!trimmed) return capitalize(sentence);
  const endsSentence = /[.!?]$/.test(trimmed);
  return `${trimmed}${endsSentence ? ' ' : '. '}${capitalize(sentence)}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
