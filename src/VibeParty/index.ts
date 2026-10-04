export { VibeHomeParty, vibePartySchema } from "./VibeParty";
export type { VibePartyProps } from "./VibeParty";
export { DURATION as VIBE_DURATION, FPS as VIBE_FPS, WIDTH as VIBE_WIDTH, HEIGHT as VIBE_HEIGHT } from "./theme";

/** Default copy. Everything is set in uppercase by the type styles. */
export const VIBE_COPY = {
  tonight: "Tonight…",
  peopleLine1: "Good",
  peopleLine2: "People",
  vibesLine1: "Good",
  vibesLine2: "Vibes",
  hero: "Vibe",
  heroSub: "Home Party",
  tagline: "Make memories. Feel the vibe.",
  // Built by `node scripts/make-music-cut.mjs`: 120 BPM, drop on frame 180.
  music: "party/music.wav",
} as const;
