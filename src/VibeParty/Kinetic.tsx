import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TITLE_GRADIENT, clamp01, mix } from "./theme";

/** Gradient-filled type. Needs a real glow copy behind it — a transparent
 *  fill can't carry a text-shadow. */
export const gradientFill: React.CSSProperties = {
  backgroundImage: TITLE_GRADIENT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
};

/**
 * Characters spring up from below through a defocus. The per-character stagger
 * is what turns a fade into kinetic type; keep it at 2-3 frames or the line
 * stops reading as one word.
 */
export const CharsRise: React.FC<{
  text: string;
  inAt: number;
  outAt?: number;
  stagger?: number;
  rise?: number;
  style?: React.CSSProperties;
}> = ({ text, inAt, outAt, stagger = 2, rise = 46, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", ...style }}>
      {Array.from(text).map((ch, i) => {
        const enter = spring({
          frame: frame - inAt - i * stagger,
          fps,
          config: { damping: 200, stiffness: 108, mass: 0.85 },
          durationInFrames: 26,
        });
        const exit =
          outAt === undefined
            ? 0
            : clamp01((frame - outAt - i * stagger * 0.6) / 10);
        const blur = mix(18, 0, enter) + exit * 16;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              transform: `translateY(${mix(rise, 0, enter) - exit * 30}px)`,
              filter: blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : undefined,
              opacity: clamp01(enter * 1.5) * (1 - exit),
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/**
 * A word that wipes up out of its own baseline. Reads as a hard, deliberate
 * reveal — the counterpart to CharsRise's softer entrance.
 */
export const WipeWord: React.FC<{
  children: React.ReactNode;
  inAt: number;
  outAt?: number;
  rise?: number;
  duration?: number;
  style?: React.CSSProperties;
}> = ({ children, inAt, outAt, rise = 90, duration = 28, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - inAt,
    fps,
    config: { damping: 200, stiffness: 84, mass: 1 },
    durationInFrames: duration,
  });
  const exit = outAt === undefined ? 0 : clamp01((frame - outAt) / 12);

  return (
    <div
      style={{
        clipPath: `inset(0% 0% ${((1 - enter) * 108).toFixed(2)}% 0%)`,
        willChange: "clip-path, transform",
      }}
    >
      <div
        style={{
          ...style,
          transform: `translateY(${(mix(rise, 0, enter) - exit * rise).toFixed(2)}px)`,
          opacity: 1 - exit,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Hairline that draws out from its centre. */
export const AccentRule: React.FC<{
  inAt: number;
  width: number;
  thickness?: number;
  delayed?: number;
}> = ({ inAt, width, thickness = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({
    frame: frame - inAt,
    fps,
    config: { damping: 200, stiffness: 70, mass: 1 },
    durationInFrames: 30,
  });
  return (
    <div
      style={{
        width,
        height: thickness,
        transform: `scaleX(${grow.toFixed(3)})`,
        background: TITLE_GRADIENT,
        opacity: 0.9,
        borderRadius: thickness,
      }}
    />
  );
};
