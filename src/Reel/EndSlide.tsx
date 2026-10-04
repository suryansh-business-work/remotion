import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Wordmark } from "./Brand";
import { REEL_HEIGHT, fontFamily, theme } from "./theme";

export const END_SLIDE_DURATION = 150; // 5s
/** Frame (within the slide) at which the red panel fully covers the video. */
export const PANEL_COVERED = 20;

/**
 * Full-bleed brand close: a red panel rises over the video, the duncit mark
 * lands, and the site address is handed off as the last thing on screen.
 */
export const EndSlide: React.FC<{
  headline: string;
  sub: string;
  website: string;
  cta: string;
  name: string;
}> = ({ headline, sub, website, cta, name }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: PANEL_COVERED,
  });
  const panelTop = interpolate(rise, [0, 1], [REEL_HEIGHT, 0]);
  const panelRadius = interpolate(rise, [0, 0.85, 1], [140, 40, 0], {
    extrapolateRight: "clamp",
  });

  const markIn = spring({
    frame: frame - 14,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 105 },
  });

  const ruleW = interpolate(frame, [28, 46], [0, 220], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const siteIn = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, mass: 0.6, stiffness: 125 },
  });

  const tailIn = interpolate(frame, [64, 82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineLines = headline.split("\n");

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: panelTop,
          height: REEL_HEIGHT,
          borderTopLeftRadius: panelRadius,
          borderTopRightRadius: panelRadius,
          overflow: "hidden",
          background: theme.brand,
        }}
      >
        {/* depth: soft light pooling behind the mark, plus two wide rings */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(78% 42% at 50% 34%, ${theme.brandLight} 0%, rgba(248,44,46,0) 68%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -320,
            top: 900,
            width: 1180,
            height: 1180,
            borderRadius: 999,
            border: "2px solid rgba(255,255,255,0.13)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 240,
            top: 1180,
            width: 1320,
            height: 1320,
            borderRadius: 999,
            border: "2px solid rgba(255,255,255,0.09)",
          }}
        />

        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            padding: "0 96px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              transform: `translateY(${(1 - markIn) * 60}px) scale(${0.82 + markIn * 0.18})`,
              opacity: markIn,
              marginBottom: 8,
            }}
          >
            <Wordmark width={560} />
          </div>

          <div
            style={{
              width: ruleW,
              height: 6,
              borderRadius: 999,
              background: "rgba(255,255,255,0.55)",
              margin: "44px 0 46px",
            }}
          />

          {headlineLines.map((line) => {
            const i = headlineLines.indexOf(line);
            const s = spring({
              frame: frame - 34 - i * 7,
              fps,
              config: { damping: 16, mass: 0.7, stiffness: 110 },
            });
            return (
              <div
                key={line}
                style={{
                  fontFamily: fontFamily.display,
                  fontWeight: 800,
                  fontSize: 92,
                  lineHeight: 1.24,
                  color: theme.paper,
                  transform: `translateY(${(1 - s) * 46}px)`,
                  opacity: interpolate(s, [0, 0.5], [0, 1], {
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
              fontFamily: fontFamily.caption,
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.4,
              color: "rgba(255,255,255,0.86)",
              marginTop: 26,
              opacity: tailIn,
            }}
          >
            {sub}
          </div>

          {/* the site address is the payoff of the whole slide */}
          <div
            style={{
              marginTop: 54,
              background: theme.paper,
              color: theme.brand,
              fontFamily: fontFamily.latin,
              fontWeight: 700,
              fontSize: 66,
              letterSpacing: -1,
              padding: "20px 62px 24px",
              borderRadius: 999,
              transform: `scale(${0.76 + siteIn * 0.24})`,
              opacity: siteIn,
              boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
            }}
          >
            {website}
          </div>

          <div
            style={{
              marginTop: 46,
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity: tailIn,
              transform: `translateY(${(1 - tailIn) * 18}px)`,
            }}
          >
            <span
              style={{
                fontFamily: fontFamily.caption,
                fontWeight: 800,
                fontSize: 40,
                color: theme.paper,
                border: "3px solid rgba(255,255,255,0.85)",
                borderRadius: 999,
                padding: "8px 34px 12px",
              }}
            >
              {cta}
            </span>
            <span
              style={{
                fontFamily: fontFamily.latin,
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.78)",
                textTransform: "uppercase",
              }}
            >
              {name}
            </span>
          </div>
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
