import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BrandPlate } from "./Brand";
import {
  BADGE,
  HERO_PLATE,
  LOWER_THIRD_TOP,
  REEL_HEIGHT,
  REEL_WIDTH,
  fontFamily,
  theme,
} from "./theme";

export const INTRO_DURATION = 104;
/** Frame at which the mark has finished docking into the corner slot. */
export const DOCK_COMPLETE = 48;

const HOLD = 6; // full-bleed brand hold
const SHRINK_END = 24; // plate has reached hero size
const DOCK_START = 28;

/**
 * One continuous brand move: the screen opens on a full-bleed duncit plate,
 * which contracts to a hero lockup and then flies into the channel-logo slot
 * in the top-left. The Hindi hook rises underneath it and lifts away again.
 */
export const Intro: React.FC<{
  hookLines: string[];
  kicker: string;
}> = ({ hookLines, kicker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- plate geometry: full bleed -> hero -> corner badge ---
  const shrink = spring({
    frame: frame - HOLD,
    fps,
    config: { damping: 200 },
    durationInFrames: SHRINK_END - HOLD,
  });
  const dock = spring({
    frame: frame - DOCK_START,
    fps,
    config: { damping: 26, mass: 0.8, stiffness: 95 },
    durationInFrames: DOCK_COMPLETE - DOCK_START,
  });

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const fullRect = { x: -4, y: -4, w: REEL_WIDTH + 8, h: REEL_HEIGHT + 8, r: 0 };
  const heroRect = {
    x: (REEL_WIDTH - HERO_PLATE.w) / 2,
    y: HERO_PLATE.cy - HERO_PLATE.h / 2,
    w: HERO_PLATE.w,
    h: HERO_PLATE.h,
    r: HERO_PLATE.r,
  };

  const stage1 = {
    x: lerp(fullRect.x, heroRect.x, shrink),
    y: lerp(fullRect.y, heroRect.y, shrink),
    w: lerp(fullRect.w, heroRect.w, shrink),
    h: lerp(fullRect.h, heroRect.h, shrink),
    r: lerp(fullRect.r, heroRect.r, shrink),
  };

  const plate = {
    x: lerp(stage1.x, BADGE.x, dock),
    y: lerp(stage1.y, BADGE.y, dock),
    w: lerp(stage1.w, BADGE.w, dock),
    h: lerp(stage1.h, BADGE.h, dock),
    r: lerp(stage1.r, BADGE.r, dock),
  };

  // Hand off to the persistent watermark once docked.
  const plateOpacity = interpolate(
    frame,
    [DOCK_COMPLETE - 3, DOCK_COMPLETE + 1],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // --- copy ---
  const copyExit = interpolate(frame, [84, INTRO_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  // Kept light: the copy sits in the lower third where the reel's own bottom
  // gradient already does most of the work.
  const scrim = interpolate(
    frame,
    [SHRINK_END - 6, 40, 82, INTRO_DURATION],
    [0.42, 0.26, 0.26, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const kickerIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 120 },
  });

  const underline = interpolate(frame, [52, 76], [0, 320], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ backgroundColor: `rgba(6,6,10,${scrim})` }} />

      {/* hook copy sits below the hero lockup */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: LOWER_THIRD_TOP,
          paddingLeft: 84,
          paddingRight: 84,
          transform: `translateY(${-copyExit * 220}px)`,
          opacity: 1 - copyExit,
        }}
      >
        <div
          style={{
            transform: `scale(${0.7 + kickerIn * 0.3}) translateY(${(1 - kickerIn) * 26}px)`,
            opacity: kickerIn,
            background: theme.paper,
            color: theme.ink,
            fontFamily: fontFamily.caption,
            fontWeight: 800,
            fontSize: 38,
            letterSpacing: 0.5,
            padding: "8px 32px 12px",
            borderRadius: 999,
            marginBottom: 26,
            boxShadow: "0 10px 34px rgba(0,0,0,0.5)",
          }}
        >
          {kicker}
        </div>

        {hookLines.map((line, i) => {
          const s = spring({
            frame: frame - 36 - i * 8,
            fps,
            config: { damping: 15, mass: 0.7, stiffness: 110 },
          });
          return (
            <div
              key={i}
              style={{
                fontFamily: fontFamily.display,
                fontWeight: 800,
                fontSize: 100,
                lineHeight: 1.24,
                color: theme.paper,
                textAlign: "center",
                textShadow: "0 12px 46px rgba(0,0,0,0.85)",
                transform: `translateY(${(1 - s) * 64}px) scale(${0.88 + s * 0.12})`,
                opacity: interpolate(s, [0, 0.45], [0, 1], {
                  extrapolateRight: "clamp",
                }),
              }}
            >
              {line}
            </div>
          );
        })}

        <div
          style={{
            marginTop: 34,
            height: 12,
            width: underline,
            borderRadius: 999,
            background: theme.brand,
            boxShadow: `0 6px 28px ${theme.brandGlow}`,
          }}
        />
      </AbsoluteFill>

      {/* the brand plate, on top of everything while it travels */}
      <div
        style={{
          position: "absolute",
          left: plate.x,
          top: plate.y,
          opacity: plateOpacity,
        }}
      >
        <BrandPlate
          width={plate.w}
          height={plate.h}
          radius={plate.r}
          shadow={shrink > 0.35}
        />
      </div>
    </AbsoluteFill>
  );
};
