import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { SHOTS } from "./cuts";
import { ACT, palette } from "./theme";

const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="240" height="240" filter="url(#n)"/></svg>';
const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;

const FLASHES = SHOTS.filter((s) => s.flash).map((s) => s.from);

/** Grade, drifting warm light, cut flashes and grain — between footage and type. */
export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();

  let flash = 0;
  for (const f of FLASHES) {
    const dt = frame - f;
    if (dt >= 0 && dt < 12) flash = Math.max(flash, Math.exp(-dt / 2.4));
  }

  // The warm leak is strongest while the venue itself is the subject.
  const leak = interpolate(
    frame,
    [0, ACT.workshop, ACT.workshop + 20, ACT.venue - 10, ACT.venue + 10, ACT.ending],
    [0.34, 0.3, 0.14, 0.14, 0.32, 0.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const lx = 30 + Math.sin(frame * 0.021) * 22;
  const ly = 22 + Math.cos(frame * 0.017) * 12;
  const rx = 72 + Math.cos(frame * 0.019 + 1.3) * 18;
  const ry = 78 + Math.sin(frame * 0.015 + 0.4) * 10;

  return (
    <>
      {/* Warm vignette: pulls the eye in, seats the type. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(115% 78% at 50% 48%, #FFFFFF 0%, #FFFFFF 45%, #D9CBBE 74%, #6E5A4E 100%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Top and bottom falloff for the Reels chrome and captions. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(13,9,7,0.42) 0%, rgba(13,9,7,0) 18%, rgba(13,9,7,0) 74%, rgba(13,9,7,0.4) 100%)",
        }}
      />
      {/* Light leaks, in the venue's own lamp amber and Duncit red. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(55% 38% at ${lx}% ${ly}%, ${palette.amber} 0%, rgba(245,165,36,0) 70%),
            radial-gradient(48% 34% at ${rx}% ${ry}%, ${palette.red} 0%, rgba(248,44,46,0) 70%)`,
          mixBlendMode: "screen",
          opacity: leak,
        }}
      />
      {flash > 0.01 ? (
        <AbsoluteFill
          style={{ backgroundColor: "#FFF6EA", opacity: flash * 0.75, mixBlendMode: "screen" }}
        />
      ) : null}
      {/* Grain last, so it sits on everything below the type. */}
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_URL,
          backgroundRepeat: "repeat",
          backgroundSize: "220px 220px",
          backgroundPosition: `${Math.floor(random(`gx${frame}`) * 240)}px ${Math.floor(
            random(`gy${frame}`) * 240,
          )}px`,
          mixBlendMode: "overlay",
          opacity: 0.09,
        }}
      />
    </>
  );
};
