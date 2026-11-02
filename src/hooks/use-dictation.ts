import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';

import { ForgetlessDevice } from '@/lib/device';

/** The phone's language, e.g. "en-ZA", so speech is understood with the right accent. */
function speechLanguage() {
  return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

/**
 * Speech to text with the phone's own speech recognition (free, no account). Each finished
 * sentence goes to `onText`; `partial` is the sentence still being spoken. Starting plays a
 * short ping so you know when to talk.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    setError(null);
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setPartial('');
  });
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript?.trim() ?? '';
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
    if (event.error === 'not-allowed') setError('Microphone access is off. Turn it on in your phone settings.');
    else if (event.error === 'network') setError('Speech needs an internet connection on this phone.');
    else if (event.error === 'service-not-allowed' || event.error === 'language-not-supported') {
      setError('Speech to text isn’t available on this phone.');
    } else setError('Couldn’t hear that. Try again.');
  });

  // Stop listening when the screen closes.
  useEffect(() => () => ExpoSpeechRecognitionModule.abort(), []);

  const start = async () => {
    setError(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone access is off. Turn it on in your phone settings.');
      return;
    }
    ForgetlessDevice?.playPing();
    // Let the ping finish so it isn't picked up as speech.
    setTimeout(() => {
      ExpoSpeechRecognitionModule.start({
        lang: speechLanguage(),
        interimResults: true,
        // Keeps listening through pauses until Stop (and mutes Android's own beeps).
        continuous: true,
        addsPunctuation: true,
      });
    }, 250);
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  return { listening, partial, error, start, stop };
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
