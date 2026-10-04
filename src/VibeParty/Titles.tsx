import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AccentRule, CharsRise, WipeWord, gradientFill } from "./Kinetic";
import { BEAT, clamp01, font, mix, palette } from "./theme";

const DISPLAY: React.CSSProperties = {
  fontFamily: font.display,
  fontWeight: 700,
  textTransform: "uppercase",
  color: palette.paper,
  lineHeight: 0.92,
  margin: 0,
};

const SHADOW = "0 14px 60px rgba(0,0,0,0.62), 0 2px 10px rgba(0,0,0,0.5)";

// ---------------------------------------------------------------------------
// 0-3s
// ---------------------------------------------------------------------------
export const TonightTitle: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill
    style={{
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 858,
    }}
  >
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 34,
      }}
    >
      <AccentRule inAt={2} width={132} />
      <CharsRise
        text={text}
        inAt={4}
        outAt={54}
        stagger={3}
        rise={54}
        style={{
          ...DISPLAY,
          fontSize: 98,
          letterSpacing: "0.34em",
          // Tracking adds a trailing gap after the last letter; pull the block
          // back by the same amount so it stays optically centred.
          marginLeft: "0.34em",
          textShadow: SHADOW,
        }}
      />
    </div>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// 3-6s
// ---------------------------------------------------------------------------
export const GoodPeopleTitle: React.FC<{ lines: [string, string] }> = ({
  lines,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = spring({
    frame: frame - 1,
    fps,
    config: { damping: 200, stiffness: 74, mass: 1 },
    durationInFrames: 26,
  });
  const barOut = clamp01((frame - 62) / 12);

  const line: React.CSSProperties = {
    ...DISPLAY,
    fontSize: 158,
    letterSpacing: "-0.015em",
    textShadow: SHADOW,
  };

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 560 }}>
      <div style={{ display: "flex", gap: 34, paddingLeft: 88 }}>
        <div
          style={{
            width: 9,
            borderRadius: 9,
            background: "linear-gradient(180deg, #FFB061 0%, #FF2E6B 100%)",
            transform: `scaleY(${(bar * (1 - barOut)).toFixed(3)})`,
            transformOrigin: "0% 100%",
            boxShadow: "0 0 34px rgba(255,72,120,0.6)",
          }}
        />
        <div>
          <WipeWord inAt={0} outAt={60} style={line}>
            {lines[0]}
          </WipeWord>
          <WipeWord inAt={6} outAt={64} style={line}>
            {lines[1]}
          </WipeWord>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 10-14s — the loudest type in the reel
// ---------------------------------------------------------------------------
export const GoodVibesTitle: React.FC<{ lines: [string, string] }> = ({
  lines,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hit = spring({
    frame: frame - 4,
    fps,
    config: { damping: 11, stiffness: 150, mass: 0.8 },
    durationInFrames: 34,
  });
  // The RGB split converges as the word lands, then re-opens a touch on every
  // beat so the type keeps moving with the track instead of going static.
  const beat = 1 - ((frame + 4) % BEAT) / BEAT;
  const split = mix(20, 0, clamp01(hit)) + Math.pow(beat, 6) * 5;
  const exit = clamp01((frame - 92) / 14);
  const scale =
    mix(0.86, 1, hit) * (1 + exit * 0.14) * (1 + Math.pow(beat, 7) * 0.018);

  const big: React.CSSProperties = {
    ...DISPLAY,
    fontSize: 264,
    letterSpacing: "-0.03em",
  };

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 700,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${scale.toFixed(4)})`,
          opacity: 1 - exit,
          filter: exit > 0 ? `blur(${(exit * 22).toFixed(1)}px)` : undefined,
        }}
      >
        <CharsRise
          text={lines[0]}
          inAt={0}
          stagger={2}
          rise={34}
          style={{
            ...DISPLAY,
            fontSize: 108,
            letterSpacing: "0.38em",
            marginLeft: "0.38em",
            color: "rgba(255,255,255,0.9)",
            textShadow: SHADOW,
          }}
        />
        <div style={{ position: "relative", marginTop: 18 }}>
          {/* chromatic echo */}
          <div
            style={{
              ...big,
              position: "absolute",
              inset: 0,
              color: palette.magenta,
              transform: `translateX(${(-split).toFixed(2)}px)`,
              mixBlendMode: "screen",
              opacity: 0.9,
            }}
          >
            {lines[1]}
          </div>
          <div
            style={{
              ...big,
              position: "absolute",
              inset: 0,
              color: palette.neon,
              transform: `translateX(${split.toFixed(2)}px)`,
              mixBlendMode: "screen",
              opacity: 0.75,
            }}
          >
            {lines[1]}
          </div>
          {/* Glow bed: a gradient fill is transparent, so it cannot carry a
              text-shadow of its own. */}
          <div
            style={{
              ...big,
              ...gradientFill,
              position: "absolute",
              inset: 0,
              filter: "blur(26px)",
              opacity: 0.85,
            }}
          >
            {lines[1]}
          </div>
          <div style={{ ...big, ...gradientFill }}>{lines[1]}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 14-20s — builds through the pull-back, then locks on the final hit
// ---------------------------------------------------------------------------
export const HeroTitle: React.FC<{
  hero: string;
  sub: string;
  tagline: string;
  /** Frame, relative to this sequence, where the closing beat lands. */
  lockAt: number;
}> = ({ hero, sub, tagline, lockAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The lock: a short overshoot plus a flare that settles into a steady rim.
  const lock = spring({
    frame: frame - lockAt,
    fps,
    config: { damping: 13, stiffness: 190, mass: 0.7 },
    durationInFrames: 30,
  });
  const flare = interpolate(
    frame,
    [lockAt, lockAt + 5, lockAt + 26],
    [0, 1, 0.22],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const settle = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200, stiffness: 60, mass: 1 },
    durationInFrames: 46,
  });
  const reveal = clamp01((frame - lockAt - 14) / 12);

  const scale = mix(1.06, 1, settle) * (1 + lock * 0.055);

  const heroStyle: React.CSSProperties = {
    ...DISPLAY,
    fontSize: 258,
    letterSpacing: "-0.035em",
  };

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 686,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${scale.toFixed(4)})`,
        }}
      >
        <WipeWord inAt={2} rise={120} duration={34}>
          <div style={{ position: "relative" }}>
            <div
              style={{
                ...heroStyle,
                ...gradientFill,
                position: "absolute",
                inset: 0,
                filter: `blur(${(20 + flare * 34).toFixed(1)}px)`,
                opacity: 0.55 + flare * 0.6,
              }}
            >
              {hero}
            </div>
            <div style={{ ...heroStyle, ...gradientFill }}>{hero}</div>
          </div>
        </WipeWord>

        <div style={{ marginTop: 26 }}>
          <CharsRise
            text={sub}
            inAt={16}
            stagger={2}
            rise={40}
            style={{
              ...DISPLAY,
              fontSize: 96,
              letterSpacing: "0.3em",
              marginLeft: "0.3em",
              textShadow: `${SHADOW}, 0 0 ${(20 + flare * 60).toFixed(
                0,
              )}px rgba(255,140,90,${(0.2 + flare * 0.5).toFixed(2)})`,
            }}
          />
        </div>

        <div style={{ marginTop: 52 }}>
          <AccentRule inAt={lockAt + 2} width={430} thickness={3} />
        </div>

        <div
          style={{
            marginTop: 40,
            opacity: reveal,
            transform: `translateY(${mix(16, 0, reveal).toFixed(2)}px)`,
          }}
        >
          <div
            style={{
              ...DISPLAY,
              fontWeight: 600,
              fontSize: 37,
              letterSpacing: "0.28em",
              marginLeft: "0.28em",
              color: "rgba(255,255,255,0.88)",
              textAlign: "center",
              textShadow: SHADOW,
            }}
          >
            {tagline}
          </div>
        </div>
      </div>

      <Img
        src={staticFile("duncit-wordmark.png")}
        style={{
          position: "absolute",
          top: 1452,
          width: 176,
          opacity: clamp01((frame - lockAt - 24) / 14) * 0.72,
          filter: "drop-shadow(0 4px 18px rgba(0,0,0,0.7))",
        }}
      />
    </AbsoluteFill>
  );
};
