import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AndroidSymbol = NonNullable<
  Extract<ComponentProps<typeof SymbolView>['name'], { android?: unknown }>['android']
>;

/** One icon across platforms: an SF Symbol on iOS, a Material Symbol on Android and web. */
export type IconName = { ios: SFSymbol; material: AndroidSymbol };

type IconProps = {
  name: IconName;
  size?: number;
  color?: ThemeColor;
};

export function Icon({ name, size = 24, color = 'text' }: IconProps) {
  const theme = useTheme();
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.material, web: name.material }}
      size={size}
      tintColor={theme[color]}
    />
  );
}

export const Icons = {
  add: { ios: 'plus', material: 'add' },
  delete: { ios: 'trash', material: 'delete' },
  check: { ios: 'checkmark', material: 'check' },
  pin: { ios: 'pin', material: 'push_pin' },
  repeat: { ios: 'repeat', material: 'repeat' },
  camera: { ios: 'camera', material: 'photo_camera' },
  photo: { ios: 'photo', material: 'image' },
  close: { ios: 'xmark', material: 'close' },
  settings: { ios: 'gearshape', material: 'settings' },
  general: { ios: 'slider.horizontal.3', material: 'tune' },
  theme: { ios: 'paintpalette', material: 'palette' },
  star: { ios: 'star.fill', material: 'star' },
  select: { ios: 'checkmark.circle', material: 'check_circle' },
  folder: { ios: 'folder', material: 'folder' },
  newFolder: { ios: 'folder.badge.plus', material: 'create_new_folder' },
  moveToFolder: { ios: 'folder', material: 'drive_file_move' },
  edit: { ios: 'pencil', material: 'edit' },
  previous: { ios: 'chevron.left', material: 'chevron_left' },
  next: { ios: 'chevron.right', material: 'chevron_right' },
  today: { ios: 'sun.max', material: 'today' },
  calendar: { ios: 'calendar', material: 'calendar_month' },
  tasks: { ios: 'checklist', material: 'checklist' },
  notes: { ios: 'note.text', material: 'sticky_note_2' },
} as const satisfies Record<string, IconName>;
