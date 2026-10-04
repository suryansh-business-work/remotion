// The cut list for the Duncit x The Japanese Bedazzle Workshop reel.
//
// Every shot points at a moment in one of the originals in
// public/Reel_4_content/videos, picked from contact sheets of all 62 clips
// (scripts/analyze-reel4.mjs). The proxy builder
// (scripts/make-reel4-proxies.mjs) reads this file directly and encodes just
// the span each shot needs, so editing a shot and re-running the script
// rebuilds only that shot.
//
// Keep this file import-free and erasable-TS only: Node strips its types.

const FPS = 30; // mirrors theme.FPS
const BEAT = (FPS * 60) / 115; // mirrors theme.BEAT
const bt = (n: number) => Math.round(n * BEAT);

/** Seconds of spare footage encoded either side of a shot's span. */
export const HANDLE_SEC = 0.3;

export type Dir = "left" | "right" | "up" | "down";

/**
 * How a shot comes in.
 *
 * Mirrored kinds (zoom, whip) play half their motion on the outgoing shot and
 * half on the incoming one, so only one video is ever decoded. Overlap kinds
 * (dissolve, scribble, splash) draw the incoming shot over the outgoing one
 * for `pre` frames before the cut and `post` frames after it.
 */
export type Transition =
  /** Reel opener: up out of black. */
  | { kind: "open" }
  | { kind: "cut" }
  | { kind: "zoom" }
  /** Camera whip: directional smear + travel. `dir` is where the camera swings. */
  | { kind: "whip"; dir: Dir }
  | { kind: "dissolve"; pre?: number; post?: number }
  /** A thick pencil scribble draws across the frame and reveals the shot. */
  | { kind: "scribble"; pre?: number; post?: number }
  /** An ink/paint blob blooms out from the subject. */
  | { kind: "splash"; pre?: number; post?: number }
  /** A torn sheet of paper sweeps across the cut (drawn as an overlay). */
  | { kind: "paper" }
  /** The shot lands as a pencil sketch and its colour floods in. */
  | { kind: "sketch" };

export type Shot = {
  /** Source clip, as its file stem in public/Reel_4_content/videos. */
  clip: string;
  /** Composition frame the shot cuts in on. */
  from: number;
  /** Composition frame the next shot cuts in on. */
  to: number;
  /** Source timecode, seconds, at the shot's cut frame. */
  at: number;
  /** Playback rate. Sources are ~30fps, so keep it at or above ~0.6. */
  speed?: number;
  /** Subject position in the frame, 0..1; the camera leans to it. */
  focus: [number, number];
  /** Optional second focus the camera travels to across the shot. */
  focusEnd?: [number, number];
  /** Scale on top of the cover fit, start -> end. */
  zoom: [number, number];
  in: Transition;
  /** White light burst on the cut. */
  flash?: boolean;
  /** Per-shot grade on top of the global one. */
  grade?: { bright?: number; sat?: number; contrast?: number };
  /** Handheld amplitude multiplier. */
  shake?: number;
};

const cut: Transition = { kind: "cut" };
const zoom: Transition = { kind: "zoom" };
const paper: Transition = { kind: "paper" };
const sketch: Transition = { kind: "sketch" };
const whip = (dir: Dir): Transition => ({ kind: "whip", dir });

export const SHOTS: Shot[] = [
  // ---- 0-4.2s OPENING: The Japanese, establishing ---------------------------
  // Bamboo blinds, woven lamp shades and the window light, pulling back.
  {
    clip: "Snapchat-1633932209", from: 0, to: bt(4), at: 0.0, speed: 0.75,
    focus: [0.5, 0.45], zoom: [1.2, 1.04], in: { kind: "open" },
  },
  // Tilt across the lamp-shade ceiling into the plants and bookshelf.
  {
    clip: "VID20260912162746", from: bt(4), to: bt(8), at: 1.1, speed: 0.9,
    focus: [0.5, 0.4], zoom: [1.12, 1.02], in: { kind: "dissolve", pre: 8, post: 8 },
  },

  // ---- 4.2-21.9s THE WORKSHOP -----------------------------------------------
  // Arriving. The scribble draws through the music's one-beat stop.
  {
    clip: "VID20260912161657", from: bt(8), to: bt(12), at: 1.55,
    focus: [0.5, 0.55], zoom: [1.08, 1.2], in: { kind: "scribble", pre: 0, post: 16 },
    grade: { bright: 1.22, sat: 1.05 },
  },
  {
    clip: "VID20260912161624", from: bt(12), to: bt(14), at: 0.25,
    focus: [0.45, 0.45], zoom: [1.18, 1.06], in: whip("right"),
  },
  // CREATE: the blank art cards and the rhinestones.
  {
    clip: "VID20260912154034", from: bt(14), to: bt(16), at: 1.15,
    focus: [0.5, 0.5], zoom: [1.22, 1.1], in: sketch,
  },
  {
    clip: "VID20260912163532", from: bt(16), to: bt(18), at: 5.2,
    focus: [0.55, 0.6], zoom: [1.12, 1.26], in: zoom,
  },
  {
    clip: "VID20260912162736", from: bt(18), to: bt(20), at: 0.05,
    focus: [0.5, 0.5], zoom: [1.22, 1.1], in: whip("left"),
  },
  {
    clip: "VID20260912154837", from: bt(20), to: bt(22), at: 4.3,
    focus: [0.5, 0.5], zoom: [1.15, 1.26], in: { kind: "splash", pre: 5, post: 9 },
  },
  // EXPRESS: heads down, the whole table at work.
  {
    clip: "Snapchat-1629010898", from: bt(22), to: bt(24), at: 2.5,
    focus: [0.5, 0.55], zoom: [1.06, 1.18], in: paper, grade: { sat: 0.94 },
  },
  {
    clip: "Snapchat-154664612", from: bt(24), to: bt(26), at: 13.0,
    focus: [0.5, 0.52], zoom: [1.16, 1.05], in: cut, grade: { sat: 0.9, contrast: 0.97 },
  },
  {
    clip: "VID20260912162722", from: bt(26), to: bt(28), at: 5.1,
    focus: [0.5, 0.55], zoom: [1.08, 1.2], in: whip("right"),
  },
  // CONNECT: friends, smiles, reactions.
  {
    clip: "Snapchat-1021765609", from: bt(28), to: bt(30), at: 0.3,
    focus: [0.5, 0.6], zoom: [1.16, 1.05], in: { kind: "splash", pre: 5, post: 9 },
  },
  {
    clip: "Snapchat-1126034965", from: bt(30), to: bt(31), at: 3.0,
    focus: [0.5, 0.62], zoom: [1.2, 1.12], in: whip("left"), grade: { sat: 0.92 },
  },
  {
    clip: "Snapchat-596573157", from: bt(31), to: bt(32), at: 11.6,
    focus: [0.5, 0.72], zoom: [1.22, 1.14], in: cut, flash: true, grade: { sat: 0.9 },
  },
  {
    clip: "Snapchat-1507074626", from: bt(32), to: bt(34), at: 1.0,
    focus: [0.5, 0.45], zoom: [1.18, 1.06], in: zoom, grade: { sat: 0.92 },
  },
  // CREATE MEMORIES: the finished cards held up, then everyone.
  {
    clip: "Snapchat-1126034965", from: bt(34), to: bt(36), at: 8.1,
    focus: [0.5, 0.62], zoom: [1.1, 1.22], in: paper, grade: { sat: 0.92 },
  },
  {
    clip: "VID20260912163726", from: bt(36), to: bt(37), at: 0.05,
    focus: [0.45, 0.4], zoom: [1.25, 1.15], in: whip("up"),
  },
  // BEDAZZLE WORKSHOP 12/09/2026, over the whole table facing the camera.
  {
    clip: "VID20260912162012", from: bt(37), to: bt(42), at: 9.0, speed: 0.85,
    focus: [0.5, 0.55], zoom: [1.04, 1.18], in: { kind: "scribble", pre: 4, post: 12 },
    grade: { bright: 1.16 },
  },

  // ---- 21.9-26.1s THE JAPANESE ----------------------------------------------
  // Bar stools, red blossoms, lamp shades and the big windows.
  {
    clip: "Snapchat-31328591", from: bt(42), to: bt(45), at: 0.0, speed: 0.65,
    focus: [0.5, 0.45], zoom: [1.04, 1.18], in: zoom, grade: { sat: 0.92 },
  },
  // Tilt down from the ceiling into the posters and the leather booth.
  {
    clip: "Snapchat-718189388", from: bt(45), to: bt(48), at: 10.9,
    focus: [0.5, 0.5], zoom: [1.12, 1.02], in: whip("down"), grade: { sat: 0.92 },
  },
  {
    clip: "VID20260912162757", from: bt(48), to: 790, at: 0.15, speed: 0.6,
    focus: [0.4, 0.45], zoom: [1.06, 1.16], in: { kind: "dissolve", pre: 6, post: 6 },
  },

  // ---- 26.1-30s DUNCIT x THE JAPANESE -----------------------------------------
  // The lamp-shade ceiling, drifting and defocused behind the brand lockup.
  {
    clip: "VID20260912164244", from: 790, to: FPS * 30, at: 1.85, speed: 0.25,
    focus: [0.5, 0.3], zoom: [1.2, 1.3], in: { kind: "dissolve", pre: 10, post: 10 },
  },
];

// ---------------------------------------------------------------------------
// Timing maths (shared by the composition and the proxy builder)
// ---------------------------------------------------------------------------

/** Frames the incoming shot is drawn before / after its cut. */
export const overlapOf = (t: Transition): [number, number] => {
  switch (t.kind) {
    case "dissolve":
      return [t.pre ?? 8, t.post ?? 8];
    case "scribble":
      return [t.pre ?? 6, t.post ?? 12];
    case "splash":
      return [t.pre ?? 5, t.post ?? 9];
    default:
      return [0, 0];
  }
};

/** Composition frames a shot is on screen: [first, end). */
export const spanOf = (index: number): [number, number] => {
  const shot = SHOTS[index];
  const next = SHOTS[index + 1];
  const [pre] = overlapOf(shot.in);
  const post = next ? overlapOf(next.in)[1] : 0;
  return [shot.from - pre, shot.to + post];
};

/** Source seconds shown at local frame `f` (0 = the cut; may be negative). */
export const sourceSecAt = (shot: Shot, f: number) => shot.at + (f * (shot.speed ?? 1)) / FPS;

/** First source second encoded into a shot's proxy. */
export const proxyStartSec = (index: number) => {
  const shot = SHOTS[index];
  const [first] = spanOf(index);
  return Math.max(0, sourceSecAt(shot, first - shot.from) - HANDLE_SEC);
};

export const proxyEndSec = (index: number) => {
  const shot = SHOTS[index];
  const [, end] = spanOf(index);
  return sourceSecAt(shot, end - shot.from) + HANDLE_SEC;
};

export const proxyFile = (index: number) =>
  `reel4/${String(index + 1).padStart(2, "0")}-${SHOTS[index].clip}.mp4`;

/**
 * Pixel size of a shot's proxy. Must match the builder: the 4K camera clips
 * keep extra resolution for push-ins, the 1080p Snapchat clips stay native.
 */
export const proxySize = (shot: Shot) =>
  shot.clip.startsWith("VID") ? { w: 1440, h: 2560 } : { w: 1080, h: 1920 };
