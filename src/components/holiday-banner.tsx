import { StyleSheet, View } from 'react-native';

import { Icon, Icons } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** "Heritage Day · Public holiday", shown at the top of a day. */
export function HolidayBanner({ name }: { name: string }) {
  const colors = useTheme();
  return (
    <View
      style={[styles.banner, { backgroundColor: colors.backgroundElement, borderLeftColor: colors.danger }]}
      accessibilityLabel={`${name}, public holiday`}>
      <Icon name={Icons.holiday} size={18} color="danger" />
      <ThemedText type="smallBold" style={styles.name}>
        {name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Public holiday
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderLeftWidth: 4,
  },
  name: {
    flexShrink: 1,
  },
});
