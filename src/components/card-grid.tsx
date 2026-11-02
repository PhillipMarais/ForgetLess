import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';

type CardGridProps<T> = {
  items: readonly T[];
  keyOf: (item: T) => string;
  render: (item: T) => ReactNode;
};

/** Cards in 1, 2 or 3 columns depending on the window width; the last row keeps card widths. */
export function CardGrid<T>({ items, keyOf, render }: CardGridProps<T>) {
  const { width, wide } = useLayout();
  const columns = width >= 1100 ? 3 : wide ? 2 : 1;
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={keyOf(row[0])} style={styles.row}>
          {row.map((item) => (
            <View key={keyOf(item)} style={styles.cell}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, index) => (
            <View key={`filler-${index}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  cell: {
    flex: 1,
  },
});
