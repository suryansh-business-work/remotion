// The cut list for the Duncit "Cake Canvas" cake painting workshop reel.
//
// Every shot points at a real asset in public/Reel_5_Content, picked from
// contact sheets of all 33 photos and 4 videos. The proxy builder
// (scripts/make-reel5-proxies.mjs) reads this file directly: photos become
// upright, downscaled JPEGs, and each video shot becomes a 30fps H.264 proxy
// of exactly the span it is on screen with its speed baked in, so a shot just
// plays its proxy from frame 0.
//
// What the footage really shows: participants decorating bento cakes with
// spatulas and colour piping bags, the long table, the finished cakes held up,
// and the café ending on the One Pourcent sign. There is no brushstroke macro,
// so the hook is built from the finished cakes.
//
// Keep this file import-free and erasable-TS only: Node strips its types.

export const FPS = 30;
/** 750 frames — 25 seconds. */
export const DURATION = 750;

export type Shot = {
  /** File in public/Reel_5_Content. */
  src: string;
  kind: "photo" | "video";
  /** Composition frame the shot cuts in on. */
  from: number;
  /** Composition frame the next shot cuts in on. */
  to: number;
  /** Video only: source seconds at the cut frame. */
  at?: number;
  /** Video only: playback rate, baked into the proxy. */
  speed?: number;
  /** Subject position in the (upright) frame, 0..1; the camera leans to it. */
  focus: [number, number];
  /** Scale on top of the cover fit, start -> end (the slow push-in). */
  zoom: [number, number];
  /** Frames the shot dissolves in over before its cut (0 = hard cut). */
  dissolve?: number;
  grade?: { bright?: number; sat?: number; contrast?: number; warm?: number };
};

export const SHOTS: Shot[] = [
  // ---- 0-3.2s HOOK: three finished cakes, matched on the cake --------------
  // "A cake." — pink cake with the Cake Canvas topper.
  {
    src: "IMG_7397.JPG", kind: "photo", from: 0, to: 32,
    focus: [0.26, 0.78], zoom: [2.15, 1.95],
  },
  // "A canvas." — the blue/pink painted top, matched to the same spot.
  {
    src: "IMG_7383.JPG", kind: "photo", from: 32, to: 62,
    focus: [0.59, 0.58], zoom: [2.6, 2.4],
  },
  // "Your creation." — the colourful one, held up with pride.
  {
    src: "IMG_7376.JPG", kind: "photo", from: 62, to: 96,
    focus: [0.41, 0.78], zoom: [2.2, 1.85],
  },

  // ---- 3.2-7s EVENT REVEAL: the Cake Canvas toppers on stone ------------------
  {
    src: "IMG_7350.JPG", kind: "photo", from: 96, to: 210,
    focus: [0.36, 0.42], zoom: [1.32, 1.14], dissolve: 10,
    grade: { bright: 1.06, sat: 0.9, warm: 0.5 },
  },

  // ---- 7-13s THE EXPERIENCE ------------------------------------------------------
  // Detailing a cake with a spatula.
  {
    src: "7890AC23-B371-420C-8E41-D97C2A823A97.mp4", kind: "video", from: 210, to: 270,
    at: 0.05, speed: 0.9, focus: [0.62, 0.62], zoom: [1.38, 1.5], dissolve: 8,
  },
  // Colour piping bags passed round the table.
  {
    src: "7890AC23-B371-420C-8E41-D97C2A823A97.mp4", kind: "video", from: 270, to: 330,
    at: 2.75, speed: 0.9, focus: [0.62, 0.42], zoom: [1.3, 1.18],
  },
  // Heads down over bright little cakes.
  {
    src: "IMG_7370.MOV", kind: "video", from: 330, to: 390,
    at: 0.1, speed: 0.6, focus: [0.42, 0.62], zoom: [1.24, 1.12], dissolve: 6,
  },

  // ---- 13-17s THE ARTIST: the workshop table, nobody singled out ---------------
  {
    src: "IMG_7400.MOV", kind: "video", from: 390, to: 450,
    at: 0.2, speed: 0.5, focus: [0.5, 0.5], zoom: [1.06, 1.16], dissolve: 10,
  },
  {
    src: "IMG_7373.JPG", kind: "photo", from: 450, to: 512,
    focus: [0.45, 0.62], zoom: [1.12, 1.24], dissolve: 8,
  },

  // ---- 17-21s DETAILS: through the café to the One Pourcent sign ---------------
  {
    src: "2F44148E-3958-4F0B-9F3E-3EA7AB5A5456.mp4", kind: "video", from: 512, to: 632,
    at: 4.4, speed: 0.8, focus: [0.5, 0.62], zoom: [1.1, 1.0], dissolve: 10,
    grade: { sat: 0.92, warm: 0.4 },
  },

  // ---- 21-25s CLOSE: the rose-topped pink cake ------------------------------------
  {
    src: "IMG_7399.JPG", kind: "photo", from: 632, to: DURATION,
    focus: [0.33, 0.7], zoom: [2.0, 1.55], dissolve: 12,
  },
];

// ---------------------------------------------------------------------------
// Timing maths (shared by the composition and the proxy builder)
// ---------------------------------------------------------------------------

/** Composition frames a shot is on screen: [first, end). */
export const spanOf = (index: number): [number, number] => {
  // A dissolve starts drawing the incoming shot `dissolve` frames early, over
  // the outgoing one, which runs right up to its `to`.
  const shot = SHOTS[index];
  return [shot.from - (shot.dissolve ?? 0), shot.to];
};

/** Video only: source seconds at composition frame `first` of the shot. */
export const proxyStartSec = (index: number) => {
  const shot = SHOTS[index];
  const [first] = spanOf(index);
  return Math.max(0, (shot.at ?? 0) + ((first - shot.from) * (shot.speed ?? 1)) / FPS);
};

/** Video only: source seconds the proxy covers (it is stretched by 1/speed). */
export const proxySourceSec = (index: number) => {
  const [first, end] = spanOf(index);
  return ((end - first) * (SHOTS[index].speed ?? 1)) / FPS;
};

const stem = (src: string) => src.replace(/\.[^.]+$/, "");

export const proxyFile = (index: number) => {
  const shot = SHOTS[index];
  return shot.kind === "photo"
    ? `reel5/${stem(shot.src)}.jpg`
    : `reel5/${String(index + 1).padStart(2, "0")}-${stem(shot.src).slice(0, 12)}.mp4`;
};

/** Pixel size of a shot's proxy. Must match the builder. */
export const proxySize = (shot: Shot) =>
  shot.kind === "photo" ? { w: 2400, h: 3200 } : { w: 1080, h: 1920 };
