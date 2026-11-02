import { randomUUID } from 'expo-crypto';

export function newId() {
  return randomUUID();
}

export function now() {
  return Date.now();
}

export function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
