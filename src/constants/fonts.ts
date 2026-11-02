/**
 * Font sets the user can pick in Settings → Theme; each applies to every theme.
 * Fonts are imported per weight (not from the package roots), so only these files ship.
 * The brand set loads at startup; the others load the first time they are needed.
 */

import * as Font from 'expo-font';

export type FontRole = 'display' | 'body' | 'mono';
export type FontWeight = 400 | 500 | 600 | 700;
export type FontFamilies = Record<FontRole, Record<FontWeight, string>>;

export const FONT_SET_IDS = ['brand', 'modern', 'friendly', 'editorial', 'technical', 'system'] as const;
export type FontSetId = (typeof FONT_SET_IDS)[number];

type FontSet = {
  label: string;
  description: string;
  /** null: the phone's own font. */
  families: FontFamilies | null;
  /** Font files by family name, for expo-font. */
  files: Record<string, number>;
};

const weights = (w400: string, w500: string, w600: string, w700: string) => ({
  400: w400,
  500: w500,
  600: w600,
  700: w700,
});

const PLEX_MONO = weights('IBMPlexMono_400Regular', 'IBMPlexMono_500Medium', 'IBMPlexMono_500Medium', 'IBMPlexMono_500Medium');

export const BRAND_FILES: Record<string, number> = {
  ChakraPetch_500Medium: require('@expo-google-fonts/chakra-petch/500Medium/ChakraPetch_500Medium.ttf'),
  ChakraPetch_600SemiBold: require('@expo-google-fonts/chakra-petch/600SemiBold/ChakraPetch_600SemiBold.ttf'),
  ChakraPetch_700Bold: require('@expo-google-fonts/chakra-petch/700Bold/ChakraPetch_700Bold.ttf'),
  IBMPlexSans_400Regular: require('@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf'),
  IBMPlexSans_500Medium: require('@expo-google-fonts/ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf'),
  IBMPlexSans_600SemiBold: require('@expo-google-fonts/ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf'),
  IBMPlexSans_700Bold: require('@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf'),
  IBMPlexMono_400Regular: require('@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf'),
  IBMPlexMono_500Medium: require('@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf'),
};

export const BRAND_FONTS: FontFamilies = {
  display: weights('ChakraPetch_500Medium', 'ChakraPetch_500Medium', 'ChakraPetch_600SemiBold', 'ChakraPetch_700Bold'),
  body: weights('IBMPlexSans_400Regular', 'IBMPlexSans_500Medium', 'IBMPlexSans_600SemiBold', 'IBMPlexSans_700Bold'),
  mono: PLEX_MONO,
};

export const FONT_SETS: Record<FontSetId, FontSet> = {
  brand: {
    label: 'Forgetless',
    description: 'Chakra Petch and IBM Plex, like the logo.',
    families: BRAND_FONTS,
    files: BRAND_FILES,
  },
  modern: {
    label: 'Modern',
    description: 'Inter: clean and very readable.',
    families: {
      display: weights('Inter_600SemiBold', 'Inter_600SemiBold', 'Inter_700Bold', 'Inter_700Bold'),
      body: weights('Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold'),
      mono: PLEX_MONO,
    },
    files: {
      Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
      Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
      Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
      Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    },
  },
  friendly: {
    label: 'Friendly',
    description: 'Nunito: soft and rounded.',
    families: {
      display: weights('Nunito_700Bold', 'Nunito_700Bold', 'Nunito_800ExtraBold', 'Nunito_800ExtraBold'),
      body: weights('Nunito_400Regular', 'Nunito_600SemiBold', 'Nunito_600SemiBold', 'Nunito_700Bold'),
      mono: PLEX_MONO,
    },
    files: {
      Nunito_400Regular: require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
      Nunito_600SemiBold: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
      Nunito_700Bold: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
      Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
    },
  },
  editorial: {
    label: 'Editorial',
    description: 'DM Serif headings with DM Sans text.',
    families: {
      display: weights('DMSerifDisplay_400Regular', 'DMSerifDisplay_400Regular', 'DMSerifDisplay_400Regular', 'DMSerifDisplay_400Regular'),
      body: weights('DMSans_400Regular', 'DMSans_500Medium', 'DMSans_600SemiBold', 'DMSans_700Bold'),
      mono: PLEX_MONO,
    },
    files: {
      DMSerifDisplay_400Regular: require('@expo-google-fonts/dm-serif-display/400Regular/DMSerifDisplay_400Regular.ttf'),
      DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
      DMSans_500Medium: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
      DMSans_600SemiBold: require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
      DMSans_700Bold: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
    },
  },
  technical: {
    label: 'Technical',
    description: 'Space Grotesk with Space Mono labels.',
    families: {
      display: weights('SpaceGrotesk_600SemiBold', 'SpaceGrotesk_600SemiBold', 'SpaceGrotesk_700Bold', 'SpaceGrotesk_700Bold'),
      body: weights('SpaceGrotesk_400Regular', 'SpaceGrotesk_500Medium', 'SpaceGrotesk_600SemiBold', 'SpaceGrotesk_700Bold'),
      mono: weights('SpaceMono_400Regular', 'SpaceMono_400Regular', 'SpaceMono_700Bold', 'SpaceMono_700Bold'),
    },
    files: {
      SpaceGrotesk_400Regular: require('@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
      SpaceGrotesk_500Medium: require('@expo-google-fonts/space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf'),
      SpaceGrotesk_600SemiBold: require('@expo-google-fonts/space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf'),
      SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
      SpaceMono_400Regular: require('@expo-google-fonts/space-mono/400Regular/SpaceMono_400Regular.ttf'),
      SpaceMono_700Bold: require('@expo-google-fonts/space-mono/700Bold/SpaceMono_700Bold.ttf'),
    },
  },
  system: {
    label: 'Phone default',
    description: "Your phone's own font.",
    families: null,
    files: {},
  },
};

export function isFontSetLoaded(id: FontSetId) {
  return Object.keys(FONT_SETS[id].files).every((name) => Font.isLoaded(name));
}

/** Loads a set's files; resolves false (and the brand fonts stay) if they can't load. */
export async function loadFontSet(id: FontSetId): Promise<boolean> {
  try {
    await Font.loadAsync(FONT_SETS[id].files);
    return true;
  } catch {
    return false;
  }
}
