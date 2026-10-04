import React from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { palette } from "./theme";

const svgUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** Paper tooth: soft mottling plus fine fibres. Static — paper doesn't move. */
const PAPER_URL = svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" width="540" height="540">' +
    '<filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="3" seed="4" result="m"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.9 0.08" numOctaves="2" seed="9" result="f"/>' +
    '<feBlend in="m" in2="f" mode="multiply"/><feColorMatrix type="saturate" values="0"/></filter>' +
    '<rect width="540" height="540" filter="url(#p)"/></svg>',
);

/** Fine film grain, re-seeded every frame. */
const GRAIN_URL = svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>' +
    '<feColorMatrix type="saturate" values="0"/></filter>' +
    '<rect width="240" height="240" filter="url(#n)"/></svg>',
);

/**
 * Grade, window light and texture — between the footage and the type, so the
 * phone footage sits in the poster's warm, sunlit paper world.
 */
export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  // The window light drifts slowly across the frame, like late sun.
  const sweep = -12 + frame * 0.022;

  return (
    <>
      {/* Warm ivory grade: lifts the blacks toward paper, pulls the café's
          white light to cream. */}
      <AbsoluteFill style={{ backgroundColor: "#F3DDC4", mixBlendMode: "multiply", opacity: 0.22 }} />
      <AbsoluteFill style={{ backgroundColor: "#3A1A12", mixBlendMode: "lighten", opacity: 0.12 }} />
      {/* Diagonal window light, as on the poster's wall. */}
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(118deg,
            rgba(255,236,206,0) ${sweep}%,
            rgba(255,236,206,0.55) ${sweep + 9}%,
            rgba(255,236,206,0) ${sweep + 20}%,
            rgba(255,236,206,0) ${sweep + 34}%)`,
          mixBlendMode: "soft-light",
          opacity: 0.75,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 45% at 88% 12%, rgba(255,226,180,0.55) 0%, rgba(255,226,180,0) 70%)",
          mixBlendMode: "screen",
          opacity: 0.5,
        }}
      />
      {/* Soft warm vignette. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 48%, #FFFFFF 0%, #FFFFFF 52%, #E6CDB8 80%, ${palette.wine} 135%)`,
          mixBlendMode: "multiply",
          opacity: 0.8,
        }}
      />
      {/* Paper, then grain. */}
      <AbsoluteFill
        style={{
          backgroundImage: PAPER_URL,
          backgroundSize: "540px 540px",
          mixBlendMode: "soft-light",
          opacity: 0.22,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN_URL,
          backgroundSize: "220px 220px",
          backgroundPosition: `${Math.floor(random(`gx${frame}`) * 240)}px ${Math.floor(random(`gy${frame}`) * 240)}px`,
          mixBlendMode: "overlay",
          opacity: 0.07,
        }}
      />
    </>
  );
};
