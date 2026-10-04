import React from "react";
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from "remotion";
import { clamp01, font, mix, palette } from "./theme";

const WORDMARK = staticFile("duncit-wordmark.png");
const WORDMARK_ASPECT = 983 / 268;
/** public/reel4/japanese-mark.png — the sign's lettering + ring, keyed off its disc. */
const MARK = staticFile("reel4/japanese-mark.png");

const ease = (frame: number, start: number, dur: number, fn = Easing.out(Easing.cubic)) =>
  fn(clamp01((frame - start) / dur));

/** Frame (local) at which the venue reveal hands over to the brand lockup. */
export const LOCKUP_AT = 50;

const SHADOW = "0 6px 30px rgba(10,6,4,0.6), 0 1px 3px rgba(10,6,4,0.5)";

/** Centre-anchored absolute box. */
const At: React.FC<{
  x: number;
  y: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * 24.6-30s. The Japanese's sign lettering lights up over the venue footage
 * with its address, then glides aside into a Duncit x The Japanese lockup as
 * the footage defocuses into warm bokeh behind a clean closing frame.
 */
export const BrandClose: React.FC<{
  address: string;
  workshop: string;
  date: string;
  closing: string;
}> = ({ address, workshop, date, closing }) => {
  const frame = useCurrentFrame();

  // --- the mark: venue reveal -> lockup ---------------------------------------
  const reveal = ease(frame, 0, 22, Easing.out(Easing.quad));
  const move = ease(frame, LOCKUP_AT, 26, Easing.inOut(Easing.cubic));
  const markSize = mix(mix(440, 520, reveal), 290, move);
  const markX = mix(540, 772, move);
  const markY = mix(870, 700, move);
  const markShine = mix(-40, 140, ease(frame, 12, 26, Easing.inOut(Easing.quad)));

  const addressIn = ease(frame, 14, 16);
  const addressOut = ease(frame, LOCKUP_AT - 6, 12, Easing.in(Easing.quad));

  // --- the lockup -----------------------------------------------------------------
  const dim = ease(frame, LOCKUP_AT - 4, 30, Easing.inOut(Easing.quad));
  const duncit = ease(frame, LOCKUP_AT + 8, 22);
  const cross = ease(frame, LOCKUP_AT + 16, 14, Easing.out(Easing.back(2)));
  const rule = ease(frame, LOCKUP_AT + 24, 16, Easing.inOut(Easing.cubic));
  const kind = ease(frame, LOCKUP_AT + 28, 16);
  const when = ease(frame, LOCKUP_AT + 36, 16);
  const words = closing.split(" ");
  const wordmarkShine = mix(-40, 140, ease(frame, LOCKUP_AT + 66, 24, Easing.inOut(Easing.quad)));
  const settle = mix(1, 1.018, ease(frame, LOCKUP_AT, 110, Easing.linear));

  const wordmarkW = 330;

  return (
    <AbsoluteFill>
      {/* Warm-black grade over the defocused footage: the logos sit in the
          reel's own light instead of on a flat card. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 45% at 50% 44%, rgba(40,20,10,0.35) 0%, rgba(13,9,7,0.82) 70%, rgba(13,9,7,0.94) 100%)`,
          opacity: dim,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 16% at 50% 37%, rgba(245,165,36,0.28) 0%, rgba(245,165,36,0) 100%),
            radial-gradient(60% 30% at 18% 88%, rgba(248,44,46,0.22) 0%, rgba(248,44,46,0) 100%)`,
          opacity: dim,
          mixBlendMode: "screen",
        }}
      />
      {/* Before the lockup, a soft pool of shadow under the lit sign. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(58% 36% at 50% 52%, rgba(13,9,7,0.78) 0%, rgba(13,9,7,0.4) 55%, rgba(13,9,7,0) 100%)",
          opacity: reveal * (1 - dim),
        }}
      />

      <AbsoluteFill style={{ transform: `scale(${settle.toFixed(4)})` }}>
        {/* THE JAPANESE */}
        <At
          x={markX}
          y={markY}
          style={{
            width: markSize,
            height: markSize,
            opacity: reveal,
            filter: `drop-shadow(0 0 ${mix(34, 18, move).toFixed(1)}px rgba(245,165,36,0.45))${
              reveal < 0.98 ? ` blur(${((1 - reveal) * 14).toFixed(1)}px)` : ""
            }`,
          }}
        >
          {/* A smoky echo of the sign's own dark disc, feathered into the
              footage, so the lettering reads without a hard-edged badge. */}
          <div
            style={{
              position: "absolute",
              inset: "-8%",
              borderRadius: "50%",
              background:
                "radial-gradient(closest-side, rgba(13,9,7,0.72) 0%, rgba(13,9,7,0.6) 72%, rgba(13,9,7,0) 100%)",
              opacity: 1 - move * 0.6,
            }}
          />
          <Img
            src={MARK}
            style={{ position: "relative", width: "100%", height: "100%", maxWidth: "none", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              WebkitMaskImage: `url(${MARK})`,
              maskImage: `url(${MARK})`,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              background: `linear-gradient(115deg, rgba(255,255,255,0) ${markShine - 18}%, rgba(255,246,225,0.95) ${markShine}%, rgba(255,255,255,0) ${markShine + 18}%)`,
              mixBlendMode: "screen",
            }}
          />
        </At>

        {/* Address, under the sign. */}
        <At
          x={540}
          y={mix(1190, 1170, addressIn)}
          style={{ opacity: addressIn * (1 - addressOut), textShadow: SHADOW }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <svg width={34} height={44} viewBox="0 0 24 32">
              <path
                d="M12 1C6 1 2 5.4 2 11c0 7.4 10 20 10 20s10-12.6 10-20C22 5.4 18 1 12 1Z"
                fill="none"
                stroke={palette.amber}
                strokeWidth={2.2}
              />
              <circle cx={12} cy={11} r={3.6} fill={palette.amber} />
            </svg>
            <div
              style={{
                fontFamily: font.serif,
                fontStyle: "italic",
                fontSize: 54,
                color: palette.paper,
                textAlign: "center",
                lineHeight: 1.15,
              }}
            >
              {address}
            </div>
          </div>
        </At>

        {/* duncit */}
        <At
          x={mix(270, 318, duncit)}
          y={700}
          style={{
            width: wordmarkW,
            height: wordmarkW / WORDMARK_ASPECT,
            opacity: duncit,
            filter: `drop-shadow(0 6px 26px rgba(10,6,4,0.6))${duncit < 0.98 ? ` blur(${((1 - duncit) * 12).toFixed(1)}px)` : ""}`,
          }}
        >
          <Img src={WORDMARK} style={{ width: "100%", height: "100%", maxWidth: "none", display: "block" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              WebkitMaskImage: `url(${WORDMARK})`,
              maskImage: `url(${WORDMARK})`,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              background: `linear-gradient(105deg, rgba(248,44,46,0) ${wordmarkShine - 20}%, rgba(255,110,100,0.9) ${wordmarkShine}%, rgba(248,44,46,0) ${wordmarkShine + 20}%)`,
            }}
          />
        </At>

        {/* × */}
        <At
          x={560}
          y={694}
          style={{
            fontFamily: font.serif,
            fontSize: 92,
            color: "rgba(244,236,223,0.82)",
            opacity: clamp01(cross * 2),
            transform: `translate(-50%, -50%) scale(${cross.toFixed(4)}) rotate(${((1 - cross) * 90).toFixed(1)}deg)`,
          }}
        >
          ×
        </At>

        {/* divider */}
        <At x={540} y={880}>
          <div style={{ width: 170 * rule, height: 2, background: palette.amber, opacity: 0.9 }} />
        </At>

        {/* BEDAZZLE WORKSHOP */}
        <At
          x={540}
          y={mix(978, 958, kind)}
          style={{
            opacity: kind,
            fontFamily: font.sans,
            fontWeight: 600,
            fontSize: 50,
            letterSpacing: "0.3em",
            paddingLeft: "0.3em",
            color: palette.paper,
            textShadow: SHADOW,
          }}
        >
          {workshop.toUpperCase()}
        </At>

        {/* 12/09/2026 */}
        <At
          x={540}
          y={mix(1068, 1050, when)}
          style={{
            opacity: when,
            fontFamily: font.serif,
            fontSize: 96,
            color: palette.amber,
            textShadow: SHADOW,
          }}
        >
          {date}
        </At>

        {/* Create. Connect. Experience. */}
        <At x={540} y={1236} style={{ display: "flex", gap: 20, textShadow: SHADOW }}>
          {words.map((w, k) => {
            const e = ease(frame, LOCKUP_AT + 48 + k * 7, 14);
            return (
              <span
                key={w + k}
                style={{
                  display: "inline-block",
                  fontFamily: font.serif,
                  fontStyle: "italic",
                  fontSize: 60,
                  color: palette.paper,
                  opacity: e,
                  transform: `translateY(${((1 - e) * 22).toFixed(1)}px)`,
                  filter: e < 0.98 ? `blur(${((1 - e) * 6).toFixed(1)}px)` : undefined,
                }}
              >
                {w}
              </span>
            );
          })}
        </At>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
