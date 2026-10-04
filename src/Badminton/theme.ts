// Look + timing constants for the duncit badminton reel.
//
// The track is a clean 120 BPM, so at 30fps one beat is exactly 15 frames and
// one bar exactly 60. Every cut, impact flash and title in this reel sits on
// that grid. The music bed opens on the bar line at 32.23s of music.mp3, which
// puts the bass drop (52.23s) on frame 600 — the first frame of the PEAK act.
//
// NOTE: this file is also imported by scripts/make-badminton-proxies.mjs via
// Node's type stripping, so it must stay free of imports and non-erasable TS.

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const BPM = 120;
/** 15 frames. */
export const BEAT = (FPS * 60) / BPM;
/** 60 frames. */
export const BAR = BEAT * 4;
/** 900 frames — exactly 30 seconds. */
export const DURATION = FPS * 30;

/** Act boundaries, in frames. */
export const ACT = {
  hook: 0, //         0-3s   strongest action, speed-ramped slam-in
  build: 90, //       3-10s  one cut per bar-ish
  intensity: 300, // 10-20s  cuts every beat, then every half beat
  peak: 600, //      20-27s  the drop: slow-mo smash, fast snap back
  ending: 810, //    27-30s  duncit brand close
} as const;

/** Where in music.mp3 the reel's frame 0 sits, in seconds (a bar line). */
export const MUSIC_START_SEC = 32.23;
/** Music envelope: a de-click fade in, and a tail out under the end card. */
export const MUSIC_FADE_IN_FRAMES = 2;
export const MUSIC_FADE_OUT_FRAMES = 26;

export const brand = {
  red: "#F82C2E",
  redDeep: "#C0161C",
  redLight: "#FF5D5F",
  ink: "#07080C",
  paper: "#FFFFFF",
} as const;

export const font = {
  display: '"Poppins", sans-serif',
} as const;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Smooth pseudo-noise in roughly [-1, 1]; reads as handheld drift. */
export const drift = (frame: number, seed: number, speed = 1) =>
  Math.sin(frame * 0.061 * speed + seed) * 0.6 +
  Math.sin(frame * 0.143 * speed + seed * 2.7) * 0.28 +
  Math.sin(frame * 0.317 * speed + seed * 5.1) * 0.12;
