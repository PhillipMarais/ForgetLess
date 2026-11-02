import type { ChangeEvent } from 'react';

import type { DateTimeFieldProps } from '@/components/date-time-field-shared';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const pad = (value: number) => String(value).padStart(2, '0');

function toInputValue(mode: DateTimeFieldProps['mode'], value: number) {
  const date = new Date(value);
  return mode === 'date'
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The browser's own date/time input, so the web preview has a real picker. */
export function DateTimeField({ mode, value, onChange, label }: DateTimeFieldProps) {
  const theme = useTheme();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (!raw) return; // cleared or half-typed
    const next = new Date(value);
    if (mode === 'date') {
      const [year, month, day] = raw.split('-').map(Number);
      next.setFullYear(year, month - 1, day);
    } else {
      const [hours, minutes] = raw.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
    }
    onChange(next.getTime());
  };

  return (
    <input
      type={mode}
      aria-label={label}
      value={toInputValue(mode, value)}
      onChange={handleChange}
      style={{
        fontFamily: Fonts.sans,
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.backgroundElement,
        colorScheme: 'light dark',
        border: 'none',
        borderRadius: Spacing.two,
        padding: `${Spacing.two}px ${Spacing.three}px`,
      }}
    />
  );
}
