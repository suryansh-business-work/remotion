// Look + timing constants for the "Vibe Home Party" reel.
//
// Everything in this reel is pinned to a beat grid rather than to loose frame
// numbers, so the cut list, the typography and the light flashes all land on
// the same pulse. 120 BPM at 30fps gives a whole-number beat (15 frames) and a
// whole-number bar (60 frames), which keeps the maths readable.

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const BPM = 120;
/** 15 frames — one beat. */
export const BEAT = (FPS * 60) / BPM;
/** 60 frames — one bar / 2 seconds. */
export const BAR = BEAT * 4;
/** 600 frames — 20 seconds, ten bars. */
export const DURATION = BAR * 10;

/** Act boundaries, in frames. Named so the cut list reads like an edit sheet. */
export const ACT = {
  darkness: 0, //  0.0s  lights off -> lights on
  people: 90, //  3.0s  friends, laughter
  music: 180, //  6.0s  the drop; fast cuts start
  peak: 300, // 10.0s  slow-mo + strobes
  pullback: 420, // 14.0s  wide, title builds
  lock: 540, // 18.0s  final hit, title locks
} as const;

// A tungsten-and-neon palette pulled from the footage itself: warm ceiling
// lamps, the cyan LED strip along the window, the magenta/teal TV wash.
export const palette = {
  ink: "#07060B",
  ember: "#FFC489",
  amber: "#FF8A3D",
  magenta: "#FF2E6B",
  neon: "#39E6FF",
  violet: "#8B5CFF",
  paper: "#FFFFFF",
} as const;

export const TITLE_GRADIENT =
  "linear-gradient(104deg, #FFE7C4 0%, #FFB061 26%, #FF6F86 58%, #FF2E6B 88%)";

export const font = {
  display: '"Poppins", "Baloo 2", sans-serif',
} as const;

/**
 * Reels chrome eats the bottom of the frame, so nothing that has to be read
 * is allowed below this line.
 */
export const SAFE_BOTTOM = 1560;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Smooth pseudo-noise in [-1, 1]. Three incommensurate sines beat against each
 * other, which reads as handheld drift rather than as a loop.
 */
export const drift = (frame: number, seed: number, speed = 1) =>
  (Math.sin((frame * 0.061 * speed) + seed) * 0.6 +
    Math.sin((frame * 0.143 * speed) + seed * 2.7) * 0.28 +
    Math.sin((frame * 0.317 * speed) + seed * 5.1) * 0.12) /
  1;
