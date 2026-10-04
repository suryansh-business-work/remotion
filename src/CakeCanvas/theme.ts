// Look + timing constants for the Duncit "Cake Canvas" cake painting reel.
//
// The look is lifted from the event poster (public/Reel_5_Content/
// event-banner.png): warm ivory paper, burgundy editorial serif, floral pink,
// soft diagonal window light, and the red Duncit plate.
//
// No music was supplied with this reel, so the edit sits on its own even
// grid: every section starts on a multiple of 6 frames and the experience
// cuts land every 2 seconds.

export { DURATION, FPS } from "./shots";

export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Section boundaries, in frames. */
export const ACT = {
  hook: 0, //         0-3.2s  three finished cakes, "A cake. A canvas. Your creation."
  title: 96, //       3.2-7s  CAKE CANVAS
  experience: 210, // 7-13s   decorating
  artist: 390, //     13-17s  with Shubhi Walia, Fluff & Cup
  details: 512, //    17-21s  One Pourcent, Lucknow / Ticket ₹599
  close: 632, //      21-25s  tagline, CTA, Duncit
} as const;

export const palette = {
  /** Poster paper. */
  ivory: "#F6EEE3",
  cream: "#EDE0CE",
  /** Poster headline burgundy. */
  burgundy: "#6A1420",
  wine: "#8B2635",
  /** Painted-flower pinks. */
  rose: "#D9909A",
  blush: "#F3D6D2",
  /** Warm near-black for shadows. */
  ink: "#2A1915",
  /** The Duncit plate. */
  duncit: "#F52F33",
} as const;

export const font = {
  serif: '"Playfair Display", "Times New Roman", serif',
  sans: '"Poppins", sans-serif',
} as const;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Seeded 0..1 random, stable across renders. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
