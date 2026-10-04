import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { FLASHES } from "./clips";
import { clamp01, drift, palette } from "./theme";

/**
 * A 220px tile of fractal noise, rasterised once by the browser and then
 * repeated. Re-seeding `feTurbulence` every frame would be far too slow at
 * 1080x1920, so the tile is static and the *offset* jumps instead — which is
 * what actual film grain does anyway.
 */
const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="220" height="220" filter="url(#n)"/></svg>';
const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;

/** Peak light-hit level at a frame, split into a warm and a white component. */
export const flashAt = (frame: number) => {
  let white = 0;
  let warm = 0;
  for (const hit of FLASHES) {
    const dt = frame - hit.f;
    if (dt < -1 || dt > (hit.d ?? 5) * 4) continue;
    // One frame of attack before the hit, then an exponential fall-off.
    const v = dt < 0 ? hit.s * 0.28 : hit.s * Math.exp(-dt / (hit.d ?? 5));
    if (hit.warm) warm = Math.max(warm, v);
    else white = Math.max(white, v);
  }
  return { white, warm, total: clamp01(white + warm) };
};

/** How hard the reel is pushing at a given frame. Drives leaks and grain. */
export const energyAt = (frame: number) =>
  interpolate(
    frame,
    [0, 44, 90, 180, 300, 345, 420, 540, 600],
    [0.06, 0.2, 0.3, 0.68, 1, 0.9, 0.62, 0.46, 0.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

/**
 * Everything that sits between the footage and the type: grade, motivated
 * light, neon rim, vignette, light hits and grain — in that order.
 */
export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const energy = energyAt(frame);
  const { white, warm } = flashAt(frame);

  // Motivated key light: the ceiling lamps sit high and slightly off-centre,
  // so the warm wash drifts around that anchor rather than pumping in place.
  const keyX = 50 + drift(frame, 1.2, 0.22) * 14;
  const keyY = 24 + drift(frame, 4.4, 0.18) * 8;
  const leakX = 78 + drift(frame, 7.7, 0.16) * 12;
  const leakY = 82 + drift(frame, 2.1, 0.14) * 9;

  return (
    <>
      {/* The grade proper. A multiplied vignette does the heavy lifting: it
          darkens and cools the edges while leaving highlight rolloff intact,
          which a black overlay or a brightness() clamp would both flatten.
          The source is bright white-walled iPhone footage, so without this the
          reel reads as a home video rather than as a night. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(122% 78% at 50% 43%, #F7E9DA 0%, #D9C3B0 34%, #8F7A90 62%, #4E3F62 84%, #2E2340 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Film lift: blacks land on deep blue rather than on zero. */}
      <AbsoluteFill
        style={{
          backgroundColor: "#161E3C",
          mixBlendMode: "lighten",
          opacity: 0.22,
        }}
      />

      {/* Warm ceiling wash. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(58% 40% at ${keyX}% ${keyY}%, rgba(255,183,110,${(
            0.18 +
            energy * 0.14
          ).toFixed(3)}) 0%, rgba(255,138,61,0) 70%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Neon bleed — magenta low right, cyan along the left edge, exactly
          where the room's LED strip and TV actually are. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(46% 34% at ${leakX}% ${leakY}%, rgba(255,46,107,${(
            0.13 +
            energy * 0.2
          ).toFixed(3)}) 0%, rgba(255,46,107,0) 72%)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(90deg, rgba(57,230,255,${(
            0.08 +
            energy * 0.15
          ).toFixed(3)}) 0%, rgba(57,230,255,0) 26%)`,
          mixBlendMode: "screen",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(270deg, rgba(139,92,255,${(
            0.06 +
            energy * 0.12
          ).toFixed(3)}) 0%, rgba(139,92,255,0) 24%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Top and bottom falloff — seats the type and keeps the Reels chrome
          from fighting the frame. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,3,8,0.46) 0%, rgba(4,3,8,0) 18%, rgba(4,3,8,0) 58%, rgba(4,3,8,0.6) 100%)",
        }}
      />

      {/* Light hits. */}
      {/* The footage filter already pops brightness on a hit; this overlay is
          only the first-frame sting, so it's kept at just over half strength
          or every hit leaves a milky tail across the following beat. */}
      {white > 0.004 ? (
        <AbsoluteFill
          style={{
            backgroundColor: palette.paper,
            mixBlendMode: "screen",
            opacity: Math.min(0.6, white * 0.55),
          }}
        />
      ) : null}
      {warm > 0.004 ? (
        <AbsoluteFill
          style={{
            backgroundColor: palette.ember,
            mixBlendMode: "screen",
            opacity: Math.min(0.6, warm * 0.7),
          }}
        />
      ) : null}

      {/* Grain last, so it sits on the grade and not under it. */}
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_URL,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          backgroundPosition: `${Math.floor(random(`gx${frame}`) * 220)}px ${Math.floor(
            random(`gy${frame}`) * 220,
          )}px`,
          mixBlendMode: "overlay",
          opacity: 0.12 + energy * 0.06,
        }}
      />
    </>
  );
};
