import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BEAT, brand, clamp01, font, mix } from "./theme";

/**
 * One huge word, slammed onto a Duncit-red slash that wipes in behind it.
 * Sits in the upper third, clear of the Reels header and the caption area.
 * `beatOffset` is the sequence's start frame modulo a beat, so the bump lands
 * on the music rather than on the word's own clock.
 */
export const ImpactWord: React.FC<{ text: string; beatOffset?: number }> = ({
  text,
  beatOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const chars = Array.from(text.toUpperCase());

  // Fit the word inside ~900px regardless of length.
  const size = Math.min(230, 900 / (0.74 * chars.length));

  const slash = interpolate(frame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const outStart = durationInFrames - 7;
  const out = clamp01((frame - outStart) / 7);
  const outEase = Easing.in(Easing.cubic)(out);

  const sinceBeat = (frame + beatOffset) % BEAT;
  const bump = 1 + 0.035 * Math.exp(-sinceBeat / 2.5);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 290,
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `translateX(${(outEase * -260).toFixed(1)}px) skewX(-9deg) scale(${bump.toFixed(4)})`,
          filter: out > 0 ? `blur(${(outEase * 16).toFixed(1)}px)` : undefined,
          opacity: 1 - outEase,
        }}
      >
        {/* The red slash. Wipes left -> right in, and retracts to the right out. */}
        <div
          style={{
            position: "absolute",
            left: -40,
            right: -40,
            top: "46%",
            height: "44%",
            background: `linear-gradient(90deg, ${brand.redDeep} 0%, ${brand.red} 40%, ${brand.redLight} 100%)`,
            transform: `scaleX(${(slash * (1 - outEase)).toFixed(3)})`,
            transformOrigin: out > 0 ? "100% 50%" : "0% 50%",
            boxShadow: "0 18px 60px rgba(248,44,46,0.45)",
          }}
        />
        <div style={{ position: "relative", display: "flex" }}>
          {chars.map((ch, i) => {
            const s = spring({
              frame: frame - 1 - i * 1.5,
              fps,
              config: { damping: 13, stiffness: 240, mass: 0.6 },
              durationInFrames: 18,
            });
            const blur = mix(12, 0, clamp01(s));
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  fontFamily: font.display,
                  fontWeight: 700,
                  fontSize: size,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: brand.paper,
                  textShadow: "0 10px 40px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)",
                  transform: `scale(${mix(2.3, 1, s).toFixed(4)})`,
                  opacity: clamp01(s * 2),
                  filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
