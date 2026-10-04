export const theme = {
  /** duncit primary brand colour */
  brand: "#F82C2E",
  /** darker tone for gradients and depth */
  brandDeep: "#C0161C",
  /** lighter tone for highlights */
  brandLight: "#FF5D5F",
  brandGlow: "rgba(248,44,46,0.5)",
  ink: "#0A0A0C",
  paper: "#FFFFFF",
} as const;

export const fontFamily = {
  display: '"Baloo 2", "Mukta", sans-serif',
  caption: '"Mukta", "Baloo 2", sans-serif',
  latin: '"Poppins", sans-serif',
} as const;

export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;
export const REEL_FPS = 30;

/**
 * Where the duncit mark lives once it has docked — the channel-logo slot in
 * the top-left. The intro animates the mark into exactly this rect, and the
 * persistent watermark then takes over from the same coordinates.
 */
export const BADGE = { x: 48, y: 46, w: 200, h: 78, r: 24 } as const;

/**
 * Mid-intro resting size of the mark, centred horizontally and parked above
 * the speaker's head so her face is never covered.
 */
export const HERO_PLATE = { w: 660, h: 250, r: 56, cy: 470 } as const;

/** Vertical band reserved for lower-third copy (hook + captions). */
export const LOWER_THIRD_TOP = 1290;

/** Wordmark width as a fraction of its plate width. */
export const WORDMARK_RATIO = 0.64;
/** public/duncit-wordmark.png intrinsic aspect ratio (w / h). */
export const WORDMARK_ASPECT = 983 / 268;
