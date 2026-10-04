// Look + timing constants for the Duncit x The Japanese Bedazzle Workshop reel.
//
// music.mp3 is a steady 115 BPM loop with its downbeat at 0.025s. At 30fps a
// beat is 15.652 frames, so the edit grid is fractional: every cut and title
// sits on `bt(n)`, the nearest whole frame to beat n. The bed opens on the bar
// line at 12.547s, which puts the track's one-beat stop (16.72s) exactly on
// the opening -> workshop transition at frame 125.
//
// NOTE: scripts/make-reel4-proxies.mjs imports cuts.ts, which mirrors the
// timing constants below, so keep cuts.ts free of imports.

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const BPM = 115;
/** 15.652 frames. */
export const BEAT = (FPS * 60) / BPM;
/** Nearest composition frame to beat `n`. */
export const bt = (n: number) => Math.round(n * BEAT);

/** 900 frames — exactly 30 seconds. */
export const DURATION = FPS * 30;

/** Act boundaries, in frames. */
export const ACT = {
  opening: 0, //       0-4.2s   venue establishing + title
  workshop: bt(8), //  4.2-21.9s the Bedazzle workshop
  venue: bt(42), //    21.9-26.1s The Japanese
  ending: bt(50), //   26.1-30s  Duncit x The Japanese close
} as const;

/** Where in music.mp3 the reel's frame 0 sits, in seconds (bar 6). */
export const MUSIC_START_SEC = 0.025 + 6 * ((60 / BPM) * 4);
export const MUSIC_FADE_IN_FRAMES = 4;
export const MUSIC_FADE_OUT_FRAMES = 36;

export const palette = {
  /** Warm near-black, lifted from the sign's disc. */
  ink: "#0D0907",
  /** Cream paper. */
  paper: "#F4ECDF",
  /** The Japanese's amber lettering. */
  amber: "#F5A524",
  amberDeep: "#E07A12",
  /** Duncit red. */
  red: "#F82C2E",
  redDeep: "#B8141A",
} as const;

export const font = {
  sans: '"Poppins", sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
} as const;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Smooth pseudo-noise in roughly [-1, 1]; reads as handheld drift. */
export const drift = (frame: number, seed: number, speed = 1) =>
  Math.sin(frame * 0.051 * speed + seed) * 0.6 +
  Math.sin(frame * 0.123 * speed + seed * 2.7) * 0.28 +
  Math.sin(frame * 0.277 * speed + seed * 5.1) * 0.12;

/** Seeded 0..1 random, stable across renders. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
