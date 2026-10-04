import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { SHOTS } from "./cuts";
import { brand } from "./theme";

const NOISE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">' +
  '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="220" height="220" filter="url(#n)"/></svg>';
const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;

type Hit = { f: number; color: "red" | "white"; s: number; decay: number };

/**
 * Every light hit in the reel, derived from the cut list: a burst on each cut
 * that asks for one, and a smaller red edge hit on every racket contact.
 */
const HITS: Hit[] = SHOTS.flatMap((shot) => [
  ...(shot.flash
    ? [{ f: shot.from, color: shot.flash, s: 1, decay: shot.flash === "red" ? 4 : 2.4 }]
    : []),
  ...(shot.hits ?? []).map((h) => ({
    f: shot.from + h,
    color: "red" as const,
    s: 0.55,
    decay: 3,
  })),
]);

/**
 * Composition frame windows of deep slow motion (rate <= 0.35). Only the
 * biggest moments are slowed that far, so only they get the letterbox.
 */
const SLOWMO: [number, number][] = SHOTS.flatMap((shot) => {
  const slow = (shot.speed ?? []).filter(([, rate]) => rate <= 0.35);
  if (slow.length === 0) return [];
  return [[shot.from + slow[0][0] - 3, shot.from + slow[slow.length - 1][0] + 2]];
});

const hitLevel = (frame: number, color: Hit["color"]) => {
  let v = 0;
  for (const hit of HITS) {
    if (hit.color !== color) continue;
    const dt = frame - hit.f;
    if (dt < 0 || dt > hit.decay * 5) continue;
    v = Math.max(v, hit.s * Math.exp(-dt / hit.decay));
  }
  return v;
};

/** Grade, light hits, slow-motion letterbox — everything between footage and type. */
export const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const red = hitLevel(frame, "red");
  const white = hitLevel(frame, "white");

  return (
    <>
      {/* Vignette: pulls the eye off the bright roof and into the court. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, #FFFFFF 0%, #FFFFFF 42%, #B9BCC8 72%, #5A5E70 100%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Top and bottom falloff: seats the type and the Reels chrome. */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,10,0.5) 0%, rgba(5,6,10,0) 20%, rgba(5,6,10,0) 70%, rgba(5,6,10,0.45) 100%)",
        }}
      />

      {/* Duncit red impact: floods in from the edges, hottest on the cut. */}
      {red > 0.01 ? (
        <>
          <AbsoluteFill
            style={{
              // Several stops keep the falloff from banding into a visible ring.
              background: `radial-gradient(90% 70% at 50% 50%, rgba(248,44,46,0) 18%, rgba(248,44,46,0.18) 42%, rgba(248,44,46,0.55) 70%, ${brand.red} 100%)`,
              opacity: Math.min(0.95, red * 0.95),
              mixBlendMode: "screen",
            }}
          />
          <AbsoluteFill
            style={{
              backgroundColor: brand.red,
              opacity: Math.min(0.5, Math.max(0, red - 0.45) * 0.9),
              mixBlendMode: "multiply",
            }}
          />
        </>
      ) : null}
      {white > 0.01 ? (
        <AbsoluteFill
          style={{
            backgroundColor: brand.paper,
            // A strobe, not a fade to white: the frame must still read through it.
            opacity: Math.min(0.5, white * 0.5),
            mixBlendMode: "screen",
          }}
        />
      ) : null}

      {SLOWMO.map(([from, to]) => (
        <SlowMoBars key={from} from={from} to={to} />
      ))}

      {/* Grain last, so it sits on the grade. */}
      <AbsoluteFill
        style={{
          backgroundImage: NOISE_URL,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          backgroundPosition: `${Math.floor(random(`gx${frame}`) * 220)}px ${Math.floor(
            random(`gy${frame}`) * 220,
          )}px`,
          mixBlendMode: "overlay",
          opacity: 0.1,
        }}
      />
    </>
  );
};

/** Cinematic letterbox that closes in while time slows, and snaps open after. */
const SlowMoBars: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [from, from + 5, to - 2, to + 2], [0, 150, 150, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (h <= 0) return null;
  const bar: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: h,
    backgroundColor: brand.ink,
  };
  return (
    <>
      <div style={{ ...bar, top: 0 }} />
      <div style={{ ...bar, bottom: 0 }} />
    </>
  );
};
