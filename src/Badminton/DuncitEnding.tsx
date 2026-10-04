import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { brand, clamp01, font, mix } from "./theme";

/** public/duncit-wordmark.png — lifted off the same logo as Reel_3_content's. */
const WORDMARK = staticFile("duncit-wordmark.png");
const WORDMARK_ASPECT = 983 / 268;

/** Frames the diagonal wipe takes to cover the footage. */
export const WIPE_FRAMES = 12;

/**
 * 27-30s. A diagonal Duncit-red panel sweeps over the last shot behind a white
 * leading edge, the wordmark slams in with a shockwave ring, a light sweep
 * crosses it, and the line + address settle into a clean final frame.
 */
export const DuncitEnding: React.FC<{ line: string; website: string }> = ({
  line,
  website,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- wipe ------------------------------------------------------------------
  const wipe = interpolate(frame, [0, WIPE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.25, 1),
  });
  // Top edge leads the bottom edge, so the sweep reads as a slash.
  const top = wipe * 150 - 8;
  const bottom = wipe * 150 - 50;
  const panel = (lead: number) =>
    `polygon(0% 0%, ${top + lead}% 0%, ${bottom + lead}% 100%, 0% 100%)`;

  // --- mark ------------------------------------------------------------------
  const markStart = 8;
  const mark = spring({
    frame: frame - markStart,
    fps,
    config: { damping: 12, stiffness: 170, mass: 0.7 },
    durationInFrames: 30,
  });
  const markScale = mix(1.9, 1, mark);
  const markBlur = Math.max(0, (1 - mark) * 26);

  const ring = clamp01((frame - markStart - 3) / 20);
  const ringEase = Easing.out(Easing.cubic)(ring);

  const shine = interpolate(frame, [38, 58], [-60, 160], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const lineIn = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200, stiffness: 110 },
    durationInFrames: 22,
  });
  const siteIn = spring({
    frame: frame - 45,
    fps,
    config: { damping: 13, stiffness: 140, mass: 0.7 },
  });

  // Court lines draw in behind everything, then hold.
  const draw = interpolate(frame, [6, 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const courtScale = mix(1.12, 1, Easing.out(Easing.cubic)(clamp01(frame / 60)));

  const markW = 700;

  return (
    <AbsoluteFill>
      {/* white leading edge */}
      <AbsoluteFill style={{ backgroundColor: brand.paper, clipPath: panel(9) }} />

      <AbsoluteFill style={{ clipPath: panel(0), overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            background: `linear-gradient(160deg, ${brand.redLight} 0%, ${brand.red} 42%, ${brand.redDeep} 100%)`,
          }}
        />
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(60% 34% at 50% 44%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* A badminton court, top-down, tilted — drawn in hairlines. */}
        <svg
          viewBox="0 0 610 1340"
          width={1500}
          height={3296}
          style={{
            position: "absolute",
            left: (1080 - 1500) / 2,
            top: (1920 - 3296) / 2,
            transform: `rotate(-24deg) scale(${courtScale.toFixed(4)})`,
            opacity: 0.16,
          }}
        >
          {[
            "M0 0H610V1340H0Z",
            "M46 0V1340",
            "M564 0V1340",
            "M0 670H610",
            "M0 472H610",
            "M0 868H610",
            "M0 76H610",
            "M0 1264H610",
            "M305 0V472",
            "M305 868V1340",
          ].map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={4}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - draw}
            />
          ))}
        </svg>

        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          {/* shockwave */}
          <div
            style={{
              position: "absolute",
              top: 830 - 450,
              left: 540 - 450,
              width: 900,
              height: 900,
              borderRadius: 999,
              border: `${mix(26, 2, ringEase).toFixed(1)}px solid rgba(255,255,255,${(
                0.55 *
                (1 - ring)
              ).toFixed(3)})`,
              transform: `scale(${mix(0.25, 1.35, ringEase).toFixed(4)})`,
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 830 - markW / WORDMARK_ASPECT / 2,
              width: markW,
              height: markW / WORDMARK_ASPECT,
              transform: `scale(${markScale.toFixed(4)})`,
              opacity: clamp01(mark * 2.5),
              filter: [
                markBlur > 0.3 ? `blur(${markBlur.toFixed(2)}px)` : "",
                "drop-shadow(0 18px 40px rgba(90,0,0,0.35))",
              ]
                .filter(Boolean)
                .join(" "),
            }}
          >
            <Img
              src={WORDMARK}
              style={{ width: "100%", height: "100%", maxWidth: "none", display: "block" }}
            />
            {/* light sweep, masked to the lettering */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                WebkitMaskImage: `url(${WORDMARK})`,
                maskImage: `url(${WORDMARK})`,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                background: `linear-gradient(105deg, rgba(255,210,210,0) ${shine - 22}%, rgba(255,120,120,0.9) ${shine}%, rgba(255,210,210,0) ${shine + 22}%)`,
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              top: 1010,
              fontFamily: font.display,
              fontWeight: 600,
              fontSize: 50,
              letterSpacing: "0.32em",
              marginLeft: "0.32em",
              color: "rgba(255,255,255,0.95)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              opacity: clamp01(lineIn * 1.4),
              transform: `translateY(${mix(34, 0, lineIn).toFixed(2)}px)`,
              clipPath: `inset(0 ${((1 - lineIn) * 50).toFixed(2)}% 0 ${((1 - lineIn) * 50).toFixed(2)}%)`,
            }}
          >
            {line}
          </div>

          <div
            style={{
              position: "absolute",
              top: 1124,
              background: brand.paper,
              color: brand.red,
              fontFamily: font.display,
              fontWeight: 700,
              fontSize: 66,
              letterSpacing: "-0.01em",
              padding: "18px 64px 20px",
              borderRadius: 999,
              opacity: clamp01(siteIn * 2),
              transform: `scale(${mix(0.7, 1, siteIn).toFixed(4)})`,
              boxShadow: "0 24px 60px rgba(90,0,0,0.3)",
            }}
          >
            {website}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
