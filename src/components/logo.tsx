import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { BRAND_FONTS } from '@/constants/fonts';
import { LOGO_PATHS, LOGO_VIEWBOX } from '@/constants/logo';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

/** The "FL" monogram, `height` tall, in the theme's text and accent colours. */
export function LogoMark({ height = 28 }: { height?: number }) {
  const { colors } = useAppTheme();
  const width = (height * LOGO_VIEWBOX.width) / LOGO_VIEWBOX.height;
  // Decorative: screen readers read the name next to it instead.
  return (
    <View aria-hidden>
      <Svg width={width} height={height} viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}>
        <Path d={LOGO_PATHS.bar} fill={colors.accent} />
        <Path d={LOGO_PATHS.f} fill={colors.text} />
        <Path d={LOGO_PATHS.l} fill={colors.text} />
        <Path d={LOGO_PATHS.foot} fill={colors.accent} />
      </Svg>
    </View>
  );
}

/** Monogram and "FORGETLESS" wordmark, for the top of the Today screen. */
export function AppBrand() {
  const theme = useAppTheme();
  // The wordmark is part of the logo, so it keeps the brand font whichever font set is chosen.
  const word = [styles.word, { fontFamily: BRAND_FONTS.display[700] }];
  return (
    <View style={styles.brand} accessibilityRole="header" accessibilityLabel="ForgetLess">
      <LogoMark height={22} />
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <ThemedText style={word}>
        FORGET
        <ThemedText themeColor="accent" style={word}>
          LESS
        </ThemedText>
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    width: 1,
    height: 20,
  },
  word: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 2,
  },
});
