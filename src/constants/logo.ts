/**
 * The Forgetless "FL" monogram: slanted F and L in ink (or white) with signal-orange cuts.
 * Shared by the in-app logo (components/logo.tsx) and the icon generator
 * (scripts/generate-brand-assets.mjs), so the app and its icons always match.
 */

export const LOGO_VIEWBOX = { width: 367, height: 180 };

export const LOGO_PATHS = {
  /** The F's top bar: orange. */
  bar: 'M27 40 L42 0 L259 0 L220 40 Z',
  /** The F's stem and middle arm: ink or white. */
  f: 'M0 180 L37 83 Q44 70 62 70 L207 70 L167 114 L74 114 L49 180 Z',
  /** The L's stem: ink or white. */
  l: 'M264 0 L289 0 L248 120 L184 180 Z',
  /** The L's foot and the cut where it meets the stem: orange. */
  foot: 'M184 180 L248 120 L242 136 L367 136 L330 180 Z',
} as const;
