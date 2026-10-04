// The cut list for the duncit badminton reel.
//
// Every shot points at a moment in one of the original clips in
// public/Reel_3_content/videos, chosen by scouting contact sheets and 10fps
// strips of all 53 clips (scripts/analyze-reel3.mjs). The proxy builder
// (scripts/make-badminton-proxies.mjs) reads this file directly and encodes
// just the span each shot needs, so editing a shot and re-running the script
// rebuilds only that shot.
//
// Keep this file import-free and erasable-TS only: Node strips its types.

const FPS = 30; // mirrors theme.FPS

/** Seconds of spare footage encoded either side of a shot's span. */
export const HANDLE_SEC = 0.25;

export type Dir = "left" | "right" | "up" | "down";

/**
 * How a shot comes in. The outgoing shot plays the mirror-image exit over its
 * last few frames, so no transition ever needs two decodes at once.
 */
export type Transition =
  | { kind: "cut" }
  /** Reel opener: frame 0 is already footage, blown out and oversized. */
  | { kind: "slam" }
  /** Camera whip: directional smear + travel. `dir` is where the camera swings. */
  | { kind: "whip"; dir: Dir }
  /** Zoom-through: the outgoing shot rushes at the lens, the new one settles. */
  | { kind: "zoom" }
  /** Hard scale snap, no blur. Pairs with an impact flash. */
  | { kind: "punch" }
  | { kind: "spin"; dir: 1 | -1 }
  /** Defocus-through. */
  | { kind: "blur" }
  /** RGB split + jitter. */
  | { kind: "glitch" };

export type Shot = {
  /** Source clip, as its file stem in public/Reel_3_content/videos. */
  clip: string;
  /** Composition frame the shot cuts in on. */
  from: number;
  durationInFrames: number;
  /** Source timecode, seconds, at the shot's first frame. */
  at: number;
  /**
   * Speed curve as [localFrame, rate] keys, linear between keys and held
   * after the last. Source time is the integral of this, so ramps are smooth.
   * Omitted = real time.
   */
  speed?: [number, number][];
  /** Landscape clips only: horizontal window, as fractions of source width. */
  crop?: { x: number; w: number };
  /** Subject position in the (cropped) frame, 0..1; the camera leans to it. */
  focus: [number, number];
  /** Optional second focus the camera travels to across the shot. */
  focusEnd?: [number, number];
  /** Scale on top of the cover fit, start -> end. */
  zoom: [number, number];
  in: Transition;
  /** Colour burst on the cut. */
  flash?: "red" | "white";
  /** Local frames of racket contact: impact kick, shake and a red edge hit. */
  hits?: number[];
  /** Handheld amplitude multiplier. */
  shake?: number;
};

const cut: Transition = { kind: "cut" };
const whip = (dir: Dir): Transition => ({ kind: "whip", dir });
const spin = (dir: 1 | -1): Transition => ({ kind: "spin", dir });
const zoom: Transition = { kind: "zoom" };
const punch: Transition = { kind: "punch" };
const blur: Transition = { kind: "blur" };
const glitch: Transition = { kind: "glitch" };

export const SHOTS: Shot[] = [
  // ---- 0-3s HOOK -------------------------------------------------------------
  // Jump smash, slammed in and ramped 1x -> 0.4x through the contact -> 1.8x.
  {
    clip: "20260909_193727", from: 0, durationInFrames: 30, at: 1.05,
    speed: [[0, 1], [7, 1], [10, 0.4], [20, 0.4], [24, 1.8], [30, 1.8]],
    focus: [0.2, 0.48], zoom: [1.3, 1.08], in: { kind: "slam" }, hits: [17],
  },
  // Red shirt airborne smash.
  {
    clip: "20260909_191759", from: 30, durationInFrames: 30, at: 3.45,
    focus: [0.62, 0.47], zoom: [1.2, 1.35], in: whip("right"), hits: [5],
  },
  // Net-post camera: smash, the operator whips across, the lunge on the far side.
  {
    clip: "20260909_192331", from: 60, durationInFrames: 30, at: 0.75,
    focus: [0.62, 0.55], focusEnd: [0.35, 0.55], zoom: [1.2, 1.1],
    in: punch, flash: "red", hits: [6],
  },

  // ---- 3-10s BUILD -----------------------------------------------------------
  {
    clip: "20260909_191707", from: 90, durationInFrames: 30, at: 2.55,
    focus: [0.2, 0.55], focusEnd: [0.35, 0.55], zoom: [1.25, 1.12],
    in: zoom, hits: [9],
  },
  // Low angle, looking up into the roof trusses.
  {
    clip: "20260909_193827", from: 120, durationInFrames: 30, at: 13.55,
    focus: [0.72, 0.6], zoom: [1.1, 1.22], in: whip("up"), hits: [16],
  },
  {
    clip: "20260909_193955", from: 150, durationInFrames: 23, at: 2.2,
    crop: { x: 0.7, w: 0.42 }, focus: [0.6, 0.62], zoom: [1.2, 1.08],
    in: spin(1),
  },
  // Stretch save.
  {
    clip: "20260909_191736", from: 173, durationInFrames: 22, at: 0.8,
    focus: [0.35, 0.55], focusEnd: [0.22, 0.55], zoom: [1.12, 1.22],
    in: glitch,
  },
  // Net exchange.
  {
    clip: "20260909_191450", from: 195, durationInFrames: 30, at: 2.9,
    crop: { x: 0.66, w: 0.42 }, focus: [0.58, 0.5], zoom: [1.05, 1.18],
    in: whip("left"), hits: [12],
  },
  {
    clip: "20260909_195426", from: 225, durationInFrames: 15, at: 0.25,
    focus: [0.45, 0.58], zoom: [1.3, 1.15], in: cut, flash: "white", hits: [7],
  },
  // Doubles pair leaping at the net.
  {
    clip: "20260909_193711", from: 240, durationInFrames: 30, at: 1.35,
    focus: [0.55, 0.58], zoom: [1.1, 1.3], in: blur, hits: [10],
  },
  {
    clip: "20260909_190954", from: 270, durationInFrames: 15, at: 3.4,
    focus: [0.8, 0.6], focusEnd: [0.6, 0.6], zoom: [1.25, 1.12],
    in: whip("right"),
  },
  {
    clip: "20260909_192604", from: 285, durationInFrames: 15, at: 0.5,
    crop: { x: 0.66, w: 0.42 }, focus: [0.5, 0.55], zoom: [1.1, 1.22],
    in: zoom,
  },

  // ---- 10-20s INTENSITY ------------------------------------------------------
  // In-camera whip between the two sides of the net.
  {
    clip: "20260909_192251", from: 300, durationInFrames: 30, at: 0.95,
    focus: [0.35, 0.55], focusEnd: [0.72, 0.55], zoom: [1.25, 1.12],
    in: punch, flash: "red",
  },
  // Overhead -> overhead match cut (front view into rear view).
  {
    clip: "20260909_195435", from: 330, durationInFrames: 15, at: 2.2,
    focus: [0.38, 0.5], zoom: [1.3, 1.18], in: whip("left"), hits: [10],
  },
  {
    clip: "20260909_193938", from: 345, durationInFrames: 15, at: 9.3,
    focus: [0.5, 0.6], zoom: [1.12, 1.25], in: cut, hits: [9],
  },
  {
    clip: "20260909_190934", from: 360, durationInFrames: 15, at: 2.95,
    focus: [0.35, 0.5], zoom: [1.3, 1.2], in: spin(-1),
  },
  // Deep lunge retrieve.
  {
    clip: "20260909_192251", from: 375, durationInFrames: 15, at: 20.05,
    focus: [0.55, 0.65], zoom: [1.2, 1.32], in: whip("right"),
  },
  // Jump smash, ramped.
  {
    clip: "20260909_192810", from: 390, durationInFrames: 30, at: 0.95,
    speed: [[0, 1], [6, 1], [10, 0.45], [20, 0.45], [24, 2], [30, 2]],
    crop: { x: 0.42, w: 0.42 }, focus: [0.5, 0.5], zoom: [1.1, 1.25],
    in: zoom, hits: [15],
  },
  {
    clip: "20260909_193827", from: 420, durationInFrames: 15, at: 9.9,
    focus: [0.72, 0.6], zoom: [1.2, 1.1], in: punch, flash: "red",
  },
  {
    clip: "20260909_191416", from: 435, durationInFrames: 15, at: 8.35,
    focus: [0.52, 0.5], zoom: [1.3, 1.15], in: glitch, hits: [5],
  },
  {
    clip: "20260909_192251", from: 450, durationInFrames: 15, at: 21.45,
    focus: [0.55, 0.52], zoom: [1.25, 1.35], in: whip("left"),
  },
  {
    clip: "20260909_192331", from: 465, durationInFrames: 15, at: 2.4,
    focus: [0.65, 0.55], zoom: [1.25, 1.15], in: zoom,
  },
  {
    clip: "20260909_190934", from: 480, durationInFrames: 15, at: 4.8,
    focus: [0.35, 0.62], zoom: [1.15, 1.3], in: spin(1),
  },
  {
    clip: "20260909_191759", from: 495, durationInFrames: 15, at: 4.95,
    focus: [0.63, 0.5], zoom: [1.3, 1.18], in: whip("up"), hits: [6],
  },
  {
    clip: "20260909_192251", from: 510, durationInFrames: 15, at: 2.7,
    focus: [0.25, 0.55], zoom: [1.15, 1.28], in: cut, flash: "white",
  },
  {
    clip: "20260909_195435", from: 525, durationInFrames: 15, at: 6.9,
    focus: [0.46, 0.45], zoom: [1.3, 1.15], in: whip("right"),
  },
  {
    clip: "20260909_190753", from: 540, durationInFrames: 15, at: 2.15,
    focus: [0.4, 0.55], zoom: [1.3, 1.4], in: blur,
  },
  {
    clip: "20260909_192025", from: 555, durationInFrames: 15, at: 1.95,
    focus: [0.85, 0.62], zoom: [1.25, 1.15], in: whip("left"),
  },
  // Half-beat strobe into the drop.
  {
    clip: "20260909_192251", from: 570, durationInFrames: 8, at: 3.7,
    focus: [0.67, 0.68], zoom: [1.3, 1.4], in: cut, flash: "white",
  },
  {
    clip: "20260909_193938", from: 578, durationInFrames: 7, at: 3.95,
    focus: [0.62, 0.6], zoom: [1.2, 1.3], in: cut,
  },
  {
    clip: "20260909_191759", from: 585, durationInFrames: 8, at: 4.0,
    focus: [0.65, 0.5], zoom: [1.35, 1.45], in: cut, flash: "white",
  },
  {
    clip: "20260909_192251", from: 593, durationInFrames: 7, at: 5.0,
    focus: [0.15, 0.6], zoom: [1.08, 1.2], in: cut,
  },

  // ---- 20-27s PEAK -----------------------------------------------------------
  // THE smash, on the drop. 0.33x through the leap and contact, then 1.6x as
  // the shuttle hits the floor at the defender's feet.
  {
    clip: "20260909_192927", from: 600, durationInFrames: 52, at: 0.25,
    speed: [[0, 1], [5, 1], [9, 0.33], [41, 0.33], [45, 1.6], [52, 1.6]],
    // Full source height (zoom 1.0 is height-limited) so the leap keeps its
    // racket and head clear of the letterbox; the push-in comes after contact.
    crop: { x: 0.62, w: 0.5625 }, focus: [0.36, 0.4], focusEnd: [0.58, 0.55],
    zoom: [1.0, 1.14], in: zoom, flash: "red", hits: [31], shake: 0.6,
  },
  // Fast snap back to real time: full-stretch dive at the net.
  {
    clip: "20260909_192025", from: 652, durationInFrames: 23, at: 0.75,
    focus: [0.3, 0.55], zoom: [1.45, 1.55], in: whip("right"),
  },
  // Running jump smash, ramped.
  {
    clip: "20260909_192251", from: 675, durationInFrames: 30, at: 6.45,
    speed: [[0, 1], [7, 1], [10, 0.45], [20, 0.45], [24, 1.8], [30, 1.8]],
    focus: [0.78, 0.65], zoom: [1.2, 1.1], in: spin(1), hits: [19],
  },
  {
    clip: "20260909_192025", from: 705, durationInFrames: 15, at: 8.6,
    focus: [0.85, 0.58], zoom: [1.12, 1.2], in: whip("left"),
  },
  // Biggest leap in the footage, 0.35x through the contact.
  {
    clip: "20260909_192251", from: 720, durationInFrames: 37, at: 11.6,
    speed: [[0, 1], [5, 1], [9, 0.35], [27, 0.35], [31, 2], [37, 2]],
    focus: [0.28, 0.6], zoom: [1.1, 1.25], in: punch, flash: "red", hits: [21],
  },
  {
    clip: "20260909_190753", from: 757, durationInFrames: 23, at: 1.15,
    focus: [0.3, 0.52], zoom: [1.3, 1.18], in: whip("right"),
  },
  // Rackets up, at 0.75x (the clip ends at 6.17s). Runs under the brand
  // wipe, which covers it by frame ~822.
  {
    clip: "20260909_194647", from: 780, durationInFrames: 46, at: 5.0,
    speed: [[0, 0.75]],
    focus: [0.5, 0.47], zoom: [1.25, 1.45], in: blur, flash: "white",
  },
];

// ---------------------------------------------------------------------------
// Source-time maths (shared by the composition and the proxy builder)
// ---------------------------------------------------------------------------

const rateAt = (keys: [number, number][], f: number) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, r1] = keys[i];
    if (f <= f1) {
      const [f0, r0] = keys[i - 1];
      return r0 + ((r1 - r0) * (f - f0)) / (f1 - f0);
    }
  }
  return keys[keys.length - 1][1];
};

/** Source seconds shown at a (possibly fractional) local frame of the shot. */
export const sourceSecAt = (shot: Shot, f: number) => {
  const keys = shot.speed;
  if (!keys) return shot.at + f / FPS;
  let area = 0;
  let prev = 0;
  const stops = [...keys.map(([k]) => k).filter((k) => k > 0 && k < f), f];
  for (const stop of stops) {
    area += ((stop - prev) * (rateAt(keys, prev) + rateAt(keys, stop))) / 2;
    prev = stop;
  }
  return shot.at + area / FPS;
};

/** First source second encoded into the shot's proxy. */
export const proxyStartSec = (shot: Shot) => Math.max(0, shot.at - HANDLE_SEC);

export const proxyFile = (index: number, shot: Shot) =>
  `badminton/${String(index + 1).padStart(2, "0")}-${shot.clip}.mp4`;

const even = (v: number) => Math.round(v / 2) * 2;

/**
 * Pixel size of a shot's proxy. Must match the scale/crop the proxy builder
 * applies: portrait 1440x2560, landscape crops of a 3840x2160 source scaled
 * to a 1920px height.
 */
export const proxySize = (shot: Shot) =>
  shot.crop
    ? { w: even((even(3840 * shot.crop.w) * 1920) / 2160), h: 1920 }
    : { w: 1440, h: 2560 };
