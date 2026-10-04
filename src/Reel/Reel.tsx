import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "./fonts";
import { BrandPlate } from "./Brand";
import { END_SLIDE_DURATION, EndSlide, PANEL_COVERED } from "./EndSlide";
import { DOCK_COMPLETE, INTRO_DURATION, Intro } from "./Intro";
import { BADGE, REEL_HEIGHT, fontFamily, theme } from "./theme";

// Geometry of the source recording: a 9:16 phone capture pillarboxed inside a
// 1280x720 frame. The portrait content is exactly 405px wide, centred.
const SRC_W = 1280;
const SRC_H = 720;
const CONTENT_LEFT = 437.5;
const FIT = REEL_HEIGHT / SRC_H; // 2.666…

export type ReelProps = {
  src: string;
  hookLines: string[];
  kicker: string;
  endHeadline: string;
  endSub: string;
  website: string;
  cta: string;
  speakerName: string;
};

export const Reel: React.FC<ReelProps> = ({
  src,
  hookLines,
  kicker,
  endHeadline,
  endSub,
  website,
  cta,
  speakerName,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const endStart = durationInFrames - END_SLIDE_DURATION;

  // Punch-in as the brand plate contracts, then an almost imperceptible drift
  // so the static talking head never feels frozen.
  const punchIn = spring({
    frame: frame - 6,
    fps,
    config: { damping: 22, mass: 1.1, stiffness: 68 },
    durationInFrames: 40,
  });
  const openScale = interpolate(punchIn, [0, 1], [1.18, 1.02]);
  const drift = interpolate(frame, [40, durationInFrames], [0, 0.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  // Ease back as the end panel rises, so the cut to brand feels intentional.
  const pullBack = interpolate(frame, [endStart - 10, endStart + PANEL_COVERED], [0, 0.055], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const videoScale = openScale + drift - pullBack;

  const audioVolume = (f: number) =>
    interpolate(
      f,
      [0, 5, durationInFrames - 34, durationInFrames - 8],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

  // The watermark picks up exactly where the intro's docking plate lands, and
  // steps aside once the end panel starts covering the frame.
  const markIn = interpolate(frame, [DOCK_COMPLETE - 2, DOCK_COMPLETE + 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const markOut = interpolate(frame, [endStart - 6, endStart + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mark = Math.min(markIn, markOut);

  const nameIn = interpolate(frame, [DOCK_COMPLETE + 4, DOCK_COMPLETE + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = interpolate(frame, [0, endStart], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ---- cropped, full-bleed source video ---- */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            transform: `scale(${videoScale})`,
            transformOrigin: "50% 42%",
          }}
        >
          <OffthreadVideo
            src={src}
            volume={audioVolume}
            pauseWhenBuffering
            style={{
              position: "absolute",
              width: SRC_W * FIT,
              height: SRC_H * FIT,
              // Tailwind preflight sets `img { max-width: 100% }`, which would
              // clamp this deliberately oversized element back to 1080px.
              maxWidth: "none",
              maxHeight: "none",
              left: -CONTENT_LEFT * FIT,
              top: 0,
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ---- legibility scrims ---- */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(122% 68% at 50% 42%, rgba(0,0,0,0) 54%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* ---- brand chrome ---- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 9,
          background: "rgba(255,255,255,0.15)",
          opacity: mark,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: theme.brand,
            boxShadow: `0 0 22px ${theme.brandGlow}`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: BADGE.x,
          top: BADGE.y,
          opacity: mark,
        }}
      >
        <BrandPlate width={BADGE.w} height={BADGE.h} radius={BADGE.r} />
        <div
          style={{
            marginTop: 18,
            marginLeft: 6,
            fontFamily: fontFamily.latin,
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.82)",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
            textTransform: "uppercase",
            opacity: nameIn,
          }}
        >
          {speakerName}
        </div>
      </div>

      {/* ---- opening animation ---- */}
      <Sequence durationInFrames={INTRO_DURATION}>
        <Intro hookLines={hookLines} kicker={kicker} />
      </Sequence>

      {/* ---- closing brand slide ---- */}
      <Sequence from={endStart} durationInFrames={END_SLIDE_DURATION}>
        <EndSlide
          headline={endHeadline}
          sub={endSub}
          website={website}
          cta={cta}
          name={speakerName}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
