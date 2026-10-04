// The footage registry and the cut list.
//
// Proxies are built by `node scripts/make-party-proxies.mjs` from the 4K60 HLG
// originals in public/Reel_2_Content. Framing is deliberately not baked into
// the proxies: the portrait clips keep the full 9:16 frame and `dance` keeps a
// 10:9 window, so every shot below can reframe, pan and punch in for free.

export type ClipId = "wide" | "people" | "candid" | "game" | "dance";

export const CLIPS: Record<
  ClipId,
  { src: string; width: number; height: number; durationSec: number }
> = {
  /** Dark blurred open -> room reveal -> full group wide -> walk to camera. */
  wide: { src: "party/wide.mp4", width: 1216, height: 2160, durationSec: 9.68 },
  /** Walk-through, mic in hand, laughing, the hands-up celebration. */
  people: { src: "party/people.mp4", width: 1216, height: 2160, durationSec: 11.07 },
  /** TV wash -> friends piled on the bed -> the candid laugh. */
  candid: { src: "party/candid.mp4", width: 1216, height: 2160, durationSec: 7.89 },
  /** Floor circle, game night. */
  game: { src: "party/game.mp4", width: 1216, height: 2160, durationSec: 3.07 },
  /** Landscape living room: neon LED strip, TV, the dance/game peak. */
  dance: { src: "party/dance.mp4", width: 1600, height: 1440, durationSec: 8.7 },
};

/** One step of a speed ramp: hold `rate` for `d` frames. */
export type RampStep = { rate: number; d: number };

export type Shot = {
  clip: ClipId;
  /** Composition frame the shot cuts in on. */
  from: number;
  durationInFrames: number;
  /** Source timecode, in seconds, at the moment of the cut. */
  at: number;
  /** Constant playback rate. Ignored when `ramp` is set. */
  rate?: number;
  /**
   * Multi-step speed ramp. Source time is chained across the steps so the ramp
   * is continuous — no repeated or skipped moment at a step boundary.
   */
  ramp?: RampStep[];
  /** Scale on top of the cover fit, start -> end. Never below 1.04: the
   *  handheld shake needs a little overscan to push against. */
  zoom: [number, number];
  /** Horizontal reframe as a fraction of the available overflow, -1..1. */
  pan?: [number, number];
  tilt?: [number, number];
  /** Horizontal smear in px on the incoming / outgoing edge of the cut. */
  blurIn?: number;
  blurOut?: number;
  /** Screen-blended glow copy of the frame. 0 disables the second decode. */
  bloom?: number;
  /** Handheld amplitude multiplier. */
  shake?: number;
  /** Brightness multiplier for a clip that was shot hotter than the rest. */
  exposure?: number;
};

// ---------------------------------------------------------------------------
// The cut list. Every `from` sits on a beat (15) or a half-beat, which is what
// makes the edit feel scored rather than merely fast.
// ---------------------------------------------------------------------------
export const SHOTS: Shot[] = [
  // -- 0-3s -- darkness, the lights come up, cinematic push-in -------------
  {
    clip: "wide",
    from: 0,
    durationInFrames: 48,
    at: 0.0,
    zoom: [1.34, 1.14],
    tilt: [0.22, -0.04],
    shake: 0.5,
  },
  {
    clip: "wide",
    from: 48,
    durationInFrames: 42,
    at: 1.42,
    zoom: [1.26, 1.08],
    pan: [-0.12, 0.06],
    blurIn: 14,
    bloom: 0.09,
    shake: 0.7,
  },

  // -- 3-6s -- good people -------------------------------------------------
  {
    clip: "people",
    from: 90,
    durationInFrames: 45,
    at: 7.3,
    rate: 0.9,
    zoom: [1.22, 1.08],
    pan: [0.14, -0.06],
    blurIn: 18,
    bloom: 0.09,
    shake: 0.8,
  },
  {
    clip: "people",
    from: 135,
    durationInFrames: 30,
    at: 9.45,
    zoom: [1.06, 1.19],
    pan: [-0.1, 0.08],
    blurIn: 10,
    shake: 0.9,
  },
  {
    clip: "candid",
    from: 165,
    durationInFrames: 15,
    at: 4.55,
    zoom: [1.25, 1.13],
    pan: [0.1, -0.04],
    blurIn: 12,
    shake: 1,
  },

  // -- 6-10s -- the drop: six cuts, each shorter than the last --------------
  {
    clip: "dance",
    exposure: 0.84,
    from: 180,
    durationInFrames: 30,
    at: 0.8,
    zoom: [1.06, 1.2],
    pan: [0.3, 0.04],
    blurIn: 24,
    bloom: 0.09,
    shake: 1.1,
  },
  {
    clip: "game",
    from: 210,
    durationInFrames: 22,
    at: 0.35,
    zoom: [1.27, 1.1],
    tilt: [0.16, -0.06],
    blurIn: 16,
    shake: 1.1,
  },
  {
    clip: "candid",
    from: 232,
    durationInFrames: 23,
    at: 2.05,
    zoom: [1.05, 1.2],
    pan: [-0.16, 0.12],
    blurIn: 16,
    shake: 1.1,
  },
  {
    clip: "people",
    from: 255,
    durationInFrames: 15,
    at: 1.65,
    zoom: [1.23, 1.08],
    pan: [0.12, -0.06],
    blurIn: 18,
    shake: 1.2,
  },
  {
    clip: "dance",
    exposure: 0.84,
    from: 270,
    durationInFrames: 15,
    at: 5.3,
    zoom: [1.05, 1.17],
    pan: [-0.32, 0.06],
    blurIn: 20,
    bloom: 0.09,
    shake: 1.2,
  },
  {
    clip: "people",
    from: 285,
    durationInFrames: 15,
    at: 4.55,
    zoom: [1.25, 1.1],
    pan: [0.16, 0.0],
    blurIn: 18,
    shake: 1.2,
  },

  // -- 10-14s -- peak: a real speed ramp, then slow-mo against fast cuts ----
  {
    clip: "dance",
    exposure: 0.84,
    from: 300,
    durationInFrames: 45,
    at: 6.3,
    // 1.7x -> 0.35x. Chained source time keeps the ramp continuous.
    ramp: [
      { rate: 1.7, d: 9 },
      { rate: 1.1, d: 9 },
      { rate: 0.6, d: 12 },
      { rate: 0.35, d: 15 },
    ],
    zoom: [1.05, 1.28],
    pan: [0.16, 0.36],
    blurIn: 26,
    bloom: 0.12,
    shake: 1.4,
  },
  {
    clip: "wide",
    from: 345,
    durationInFrames: 30,
    at: 5.35,
    rate: 0.5,
    zoom: [1.12, 1.25],
    tilt: [0.06, -0.06],
    blurIn: 12,
    bloom: 0.12,
    shake: 0.6,
  },
  {
    clip: "people",
    from: 375,
    durationInFrames: 22,
    at: 7.85,
    rate: 1.15,
    zoom: [1.26, 1.08],
    pan: [-0.14, 0.1],
    blurIn: 20,
    bloom: 0.09,
    shake: 1.5,
  },
  {
    clip: "dance",
    exposure: 0.84,
    from: 397,
    durationInFrames: 23,
    at: 2.9,
    rate: 1.25,
    zoom: [1.08, 1.27],
    pan: [-0.26, 0.22],
    blurIn: 24,
    blurOut: 34,
    bloom: 0.09,
    shake: 1.5,
  },

  // -- 14-18s -- one unbroken 4s pull-back to the whole room ----------------
  {
    clip: "wide",
    from: 420,
    durationInFrames: 120,
    at: 3.55,
    zoom: [1.22, 1.05],
    tilt: [-0.08, 0.07],
    blurIn: 30,
    bloom: 0.09,
    shake: 0.55,
  },

  // -- 18-20s -- final hit, slow-mo, the title locks ------------------------
  {
    clip: "wide",
    from: 540,
    durationInFrames: 60,
    at: 8.28,
    rate: 0.6,
    zoom: [1.14, 1.04],
    tilt: [0.05, -0.03],
    blurIn: 10,
    bloom: 0.2,
    shake: 0.35,
  },
];

/**
 * Light hits. `s` is peak strength, `d` the decay in frames. The 6s, 10s, 14s
 * and 18s entries are the structural hits — the drop, the peak, the reveal and
 * the lock — everything else is an accent on the beat.
 */
export const FLASHES: { f: number; s: number; d?: number; warm?: boolean }[] = [
  { f: 14, s: 0.34, d: 5, warm: true }, // lamps stutter on
  { f: 20, s: 0.22, d: 3, warm: true },
  { f: 27, s: 0.6, d: 9, warm: true }, // and hold
  { f: 48, s: 0.36, d: 5 },
  { f: 90, s: 0.46, d: 6 },
  { f: 135, s: 0.26, d: 4 },
  { f: 165, s: 0.28, d: 4 },
  { f: 180, s: 0.7, d: 5 }, // the drop
  { f: 210, s: 0.3, d: 4 },
  { f: 232, s: 0.24, d: 4 },
  { f: 255, s: 0.32, d: 4 },
  { f: 270, s: 0.26, d: 4 },
  { f: 285, s: 0.28, d: 4 },
  { f: 300, s: 0.72, d: 5 }, // peak
  { f: 315, s: 0.24, d: 3 },
  { f: 330, s: 0.34, d: 4 },
  { f: 345, s: 0.5, d: 4 },
  { f: 360, s: 0.28, d: 3 },
  { f: 375, s: 0.52, d: 4 },
  { f: 390, s: 0.3, d: 3 },
  { f: 405, s: 0.3, d: 4 },
  { f: 420, s: 0.66, d: 6 }, // pull back
  { f: 480, s: 0.18, d: 6, warm: true },
  { f: 540, s: 0.85, d: 7 }, // lock
];
