import { useWindowDimensions } from 'react-native';

import { WideLayoutMinWidth } from '@/constants/theme';

/** Whether there is room for side-by-side layouts (landscape phones, tablets). */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, wide: width >= WideLayoutMinWidth, landscape: width > height };
}
