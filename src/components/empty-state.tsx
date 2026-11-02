import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={40} color="textSecondary" />
      <ThemedText type="smallBold" style={styles.text}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  text: {
    textAlign: 'center',
  },
});
