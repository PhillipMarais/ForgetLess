import type { Href } from 'expo-router';

import type { Icons } from '@/components/icon';

/** The app's bottom tabs; shared by the native and web tab bars. */
export const TABS = [
  { name: 'index', href: '/', label: 'Today', icon: 'today' },
  { name: 'calendar', href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { name: 'tasks', href: '/tasks', label: 'Tasks', icon: 'tasks' },
  { name: 'notes', href: '/notes', label: 'Notes', icon: 'notes' },
] as const satisfies readonly { name: string; href: Href; label: string; icon: keyof typeof Icons }[];
