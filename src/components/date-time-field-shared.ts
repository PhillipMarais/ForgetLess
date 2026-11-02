import { formatTime } from '@/lib/dates';

// Shared by date-time-field.tsx and date-time-field.web.tsx. It lives in its own file because
// on web, importing "date-time-field" resolves to the .web.tsx file itself.

export type DateTimeFieldProps = {
  mode: 'date' | 'time';
  /** Epoch ms. In date mode the time of day is kept; in time mode the day is kept. */
  value: number;
  onChange: (value: number) => void;
  /** Read by screen readers. */
  label: string;
};

export function formatFieldValue(mode: DateTimeFieldProps['mode'], value: number) {
  return mode === 'date'
    ? new Date(value).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : formatTime(value);
}
