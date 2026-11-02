import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, PixelRatio, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ForgetlessDevice, type PdfPage } from '@/lib/device';

/**
 * A PDF's pages, top to bottom. Android draws each page to a picture as it scrolls into
 * view (see renderPdfPage in modules/forgetless-device).
 */
export function PdfPages({ uri }: { uri: string }) {
  const theme = useTheme();
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    ForgetlessDevice?.pdfPageCount(uri)
      .then((pages) => active && setCount(pages))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [uri]);

  if (failed || !ForgetlessDevice) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.message}>
        This PDF can’t be opened. It may be damaged or password-protected.
      </ThemedText>
    );
  }
  if (count === null) return <ActivityIndicator color={theme.accent} style={styles.message} />;

  return (
    <FlatList
      data={Array.from({ length: count }, (_, index) => index)}
      keyExtractor={(index) => String(index)}
      renderItem={({ item }) => <Page uri={uri} index={item} count={count} />}
      contentContainerStyle={styles.list}
      initialNumToRender={2}
      windowSize={5}
    />
  );
}

function Page({ uri, index, count }: { uri: string; index: number; count: number }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const displayWidth = width - Spacing.three * 2;
  const pixels = Math.min(2000, Math.round(displayWidth * PixelRatio.get()));
  const [page, setPage] = useState<PdfPage | null>(null);

  useEffect(() => {
    let active = true;
    ForgetlessDevice?.renderPdfPage(uri, index, pixels).then((rendered) => active && setPage(rendered));
    return () => {
      active = false;
    };
  }, [uri, index, pixels]);

  const height = page ? (displayWidth * page.height) / page.width : displayWidth * 1.4;
  return (
    <View style={styles.page} accessibilityLabel={`Page ${index + 1} of ${count}`}>
      {page ? (
        <Image source={{ uri: page.uri }} style={{ width: displayWidth, height }} contentFit="contain" />
      ) : (
        <View style={[styles.placeholder, { width: displayWidth, height, backgroundColor: theme.backgroundElement }]}>
          <ActivityIndicator color={theme.accent} />
        </View>
      )}
      <ThemedText type="label" themeColor="textSecondary">
        {index + 1} / {count}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    padding: Spacing.four,
    textAlign: 'center',
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  page: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
