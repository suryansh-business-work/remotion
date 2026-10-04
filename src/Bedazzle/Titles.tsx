import React from "react";
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from "remotion";
import { clamp01, font, hash, mix, palette } from "./theme";

const WORDMARK = staticFile("duncit-wordmark.png");
const WORDMARK_ASPECT = 983 / 268;

const ease = (frame: number, start: number, dur: number, fn = Easing.out(Easing.cubic)) =>
  fn(clamp01((frame - start) / dur));

/** A line that rises into place from behind an invisible edge. */
const Rise: React.FC<{
  frame: number;
  start: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ frame, start, dur = 14, children, style }) => {
  const e = ease(frame, start, dur);
  return (
    <div style={{ overflow: "hidden", padding: "0.12em 0.3em 0.18em", ...style }}>
      <div
        style={{
          transform: `translateY(${((1 - e) * 110).toFixed(2)}%)`,
          filter: e < 0.98 ? `blur(${((1 - e) * 8).toFixed(2)}px)` : undefined,
          opacity: clamp01(e * 1.6),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Exit shared by the title blocks: drift up, defocus, fade. */
const exitStyle = (frame: number, start: number, dur: number): React.CSSProperties => {
  const x = ease(frame, start, dur, Easing.in(Easing.cubic));
  if (x <= 0) return {};
  return {
    transform: `translateY(${(-40 * x).toFixed(1)}px)`,
    filter: `blur(${(10 * x).toFixed(2)}px)`,
    opacity: 1 - x,
  };
};

/** A loose hand-drawn swash, drawn in with the pen. */
const Swash: React.FC<{ width: number; progress: number; color: string; stroke?: number }> = ({
  width,
  progress,
  color,
  stroke = 7,
}) => (
  <svg width={width} height={44} viewBox={`0 0 ${width} 44`} style={{ display: "block", overflow: "visible" }}>
    <path
      d={`M 6 30 C ${width * 0.22} 14, ${width * 0.42} 38, ${width * 0.6} 24 S ${width * 0.9} 12, ${width - 6} 22`}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - progress}
    />
  </svg>
);

const SHADOW = "0 6px 30px rgba(10,6,4,0.55), 0 1px 3px rgba(10,6,4,0.5)";

// ---------------------------------------------------------------------------
// 0-4s: DUNCIT EVENT / @ THE JAPANESE / BBD Green City, Semra
// ---------------------------------------------------------------------------

export const OpeningTitle: React.FC<{ venue: string; place: string; duration: number }> = ({
  venue,
  place,
  duration,
}) => {
  const frame = useCurrentFrame();
  const backdrop = ease(frame, 0, 18) * (1 - ease(frame, duration - 14, 14));

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(75% 30% at 50% 50%, rgba(13,9,7,0.62) 0%, rgba(13,9,7,0.25) 55%, rgba(13,9,7,0) 100%)",
          opacity: backdrop,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          textShadow: SHADOW,
          ...exitStyle(frame, duration - 16, 14),
        }}
      >
        <Rise frame={frame} start={8}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Img
              src={WORDMARK}
              style={{
                height: 62,
                width: 62 * WORDMARK_ASPECT,
                maxWidth: "none",
                filter: "drop-shadow(0 4px 18px rgba(10,6,4,0.5))",
              }}
            />
            <span
              style={{
                fontFamily: font.sans,
                fontWeight: 600,
                fontSize: 40,
                letterSpacing: "0.42em",
                color: palette.paper,
                marginTop: 6,
              }}
            >
              EVENT
            </span>
          </div>
        </Rise>
        <Rise frame={frame} start={18} dur={16} style={{ marginTop: 6 }}>
          <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span
              style={{
                fontFamily: font.serif,
                fontStyle: "italic",
                fontSize: 88,
                color: palette.amber,
                marginRight: 16,
              }}
            >
              @
            </span>
            <span
              style={{
                fontFamily: font.serif,
                fontSize: Math.min(122, 1600 / venue.length),
                lineHeight: 1,
                letterSpacing: "0.01em",
                color: palette.paper,
              }}
            >
              {venue.toUpperCase()}
            </span>
          </div>
        </Rise>
        <div style={{ marginTop: -18 }}>
          <Swash width={560} progress={ease(frame, 30, 18, Easing.inOut(Easing.cubic))} color={palette.amber} />
        </div>
        <Rise frame={frame} start={36}>
          <div
            style={{
              fontFamily: font.serif,
              fontStyle: "italic",
              fontSize: 58,
              color: "rgba(244,236,223,0.92)",
            }}
          >
            {place}
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// CREATE / EXPRESS / CONNECT / CREATE memories
// ---------------------------------------------------------------------------

/**
 * One big word, drawn first as an outline — like a pencil sketch of the
 * lettering — then filled, with a Duncit-red swash underneath. An optional
 * `sub` word is hand-lettered in below.
 */
export const WordReveal: React.FC<{ word: string; sub?: string; duration: number }> = ({
  word,
  sub,
  duration,
}) => {
  const frame = useCurrentFrame();
  const text = word.toUpperCase();
  const size = Math.min(206, 940 / (0.72 * text.length));
  const textW = Math.min(980, 0.7 * size * text.length);

  const draw = ease(frame, 0, 13, Easing.inOut(Easing.cubic));
  const fill = ease(frame, 9, 9, Easing.out(Easing.quad));
  const swash = ease(frame, 12, 13, Easing.inOut(Easing.cubic));
  const subIn = ease(frame, 14, 16, Easing.inOut(Easing.quad));
  const pop = mix(1.08, 1, ease(frame, 0, 14));

  const exit = ease(frame, duration - 9, 9, Easing.in(Easing.cubic));
  const top = sub ? 250 : 300;

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(13,9,7,0.55) 0%, rgba(13,9,7,0.28) 30%, rgba(13,9,7,0) 48%)",
          opacity: clamp01(frame / 8) * (1 - exit),
        }}
      />
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${(-50 * exit).toFixed(1)}px) scale(${pop.toFixed(4)})`,
          opacity: 1 - exit,
          filter: `drop-shadow(0 10px 34px rgba(10,6,4,0.5))${exit > 0 ? ` blur(${(12 * exit).toFixed(1)}px)` : ""}`,
        }}
      >
        <svg width={1080} height={size * 1.08} viewBox={`0 0 1080 ${size * 1.08}`} style={{ overflow: "visible" }}>
          <text
            x={540}
            y={size * 0.86}
            textAnchor="middle"
            fontFamily={font.sans}
            fontWeight={700}
            fontSize={size}
            letterSpacing={-0.01 * size}
            fill={palette.paper}
            fillOpacity={fill}
            stroke={palette.paper}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeDasharray="1800 1800"
            strokeDashoffset={(1 - draw) * 1800}
          >
            {text}
          </text>
        </svg>
        <div style={{ marginTop: -4 }}>
          <Swash width={textW * 0.72} progress={swash} color={palette.red} stroke={10} />
        </div>
        {sub ? (
          <div
            style={{
              marginTop: -30,
              fontFamily: font.serif,
              fontStyle: "italic",
              fontSize: 190,
              lineHeight: 1.1,
              color: palette.amber,
              transform: "rotate(-4deg)",
              clipPath: `inset(-20% ${((1 - subIn) * 100).toFixed(2)}% -20% -5%)`,
              padding: "0 0.1em",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// BEDAZZLE WORKSHOP / 12/09/2026
// ---------------------------------------------------------------------------

/** A four-point rhinestone glint. */
const Glint: React.FC<{ x: number; y: number; size: number; t: number; rot: number }> = ({
  x,
  y,
  size,
  t,
  rot,
}) => {
  if (t <= 0) return null;
  const s = size * t;
  return (
    <path
      d="M0,-1 C0.12,-0.12 0.12,-0.12 1,0 C0.12,0.12 0.12,0.12 0,1 C-0.12,0.12 -0.12,0.12 -1,0 C-0.12,-0.12 -0.12,-0.12 0,-1 Z"
      transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
      fill="#FFF8EC"
      style={{ filter: "drop-shadow(0 0 10px rgba(255,214,140,0.95))" }}
    />
  );
};

export const BedazzleTitle: React.FC<{ title: string; kind: string; date: string; duration: number }> = ({
  title,
  kind,
  date,
  duration,
}) => {
  const frame = useCurrentFrame();
  const text = title.toUpperCase();
  const size = Math.min(180, 960 / (0.72 * text.length));

  const draw = ease(frame, 0, 12, Easing.inOut(Easing.cubic));
  const fill = ease(frame, 8, 9);
  const shine = mix(-0.6, 1.6, ease(frame, 14, 30, Easing.inOut(Easing.quad)));
  const pill = ease(frame, 22, 14, Easing.out(Easing.back(1.8)));
  const exit = ease(frame, duration - 8, 8, Easing.in(Easing.cubic));

  const glints = Array.from({ length: 12 }, (_, k) => {
    const born = 10 + k * 2.2;
    const life = frame - born;
    const twinkle = life > 0 ? Math.max(0, Math.sin(life * 0.32 + k)) * ease(frame, born, 6) : 0;
    return {
      x: 110 + hash(k * 4.7) * 860,
      y: 20 + hash(k * 9.1) * (size * 1.25),
      size: 10 + hash(k * 2.3) * 22,
      t: twinkle,
      rot: frame * 3 + k * 40,
    };
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(13,9,7,0.72) 0%, rgba(13,9,7,0.45) 30%, rgba(13,9,7,0) 50%)",
          opacity: clamp01(frame / 8) * (1 - exit),
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 270,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: 1 - exit,
          transform: `scale(${mix(1, 0.94, exit).toFixed(4)})`,
          filter: exit > 0 ? `blur(${(12 * exit).toFixed(1)}px)` : undefined,
        }}
      >
        <svg width={1080} height={size * 1.3} viewBox={`0 0 1080 ${size * 1.3}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="bz-shine" x1="0" x2="1" y1="0" y2="0.35">
              <stop offset={shine - 0.35} stopColor={palette.paper} />
              <stop offset={shine - 0.08} stopColor="#FFE3A6" />
              <stop offset={shine} stopColor="#FFFFFF" />
              <stop offset={shine + 0.08} stopColor="#FFD27A" />
              <stop offset={shine + 0.35} stopColor={palette.paper} />
            </linearGradient>
          </defs>
          <text
            x={540}
            y={size * 0.95}
            textAnchor="middle"
            fontFamily={font.sans}
            fontWeight={700}
            fontSize={size}
            letterSpacing={0.02 * size}
            fill="url(#bz-shine)"
            fillOpacity={fill}
            stroke={palette.paper}
            strokeWidth={3}
            strokeDasharray="1800 1800"
            strokeDashoffset={(1 - draw) * 1800}
            style={{ filter: "drop-shadow(0 10px 30px rgba(10,6,4,0.55))" }}
          >
            {text}
          </text>
          {glints.map((g, k) => (
            <Glint key={k} {...g} />
          ))}
        </svg>
        <Rise frame={frame} start={13} style={{ marginTop: -10 }}>
          <div
            style={{
              fontFamily: font.sans,
              fontWeight: 600,
              fontSize: 50,
              letterSpacing: "0.55em",
              marginLeft: "0.55em",
              color: palette.paper,
              textShadow: SHADOW,
            }}
          >
            {kind.toUpperCase()}
          </div>
        </Rise>
        <div
          style={{
            marginTop: 26,
            padding: "6px 40px 12px",
            borderRadius: 999,
            background: `linear-gradient(135deg, ${palette.red} 0%, ${palette.redDeep} 100%)`,
            boxShadow: "0 16px 44px rgba(120,10,12,0.45)",
            fontFamily: font.serif,
            fontSize: 70,
            lineHeight: 1.15,
            color: "#FFF7EE",
            transform: `scale(${pill.toFixed(4)})`,
            opacity: clamp01(pill * 2),
          }}
        >
          {date}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Your next experience / STARTS HERE
// ---------------------------------------------------------------------------

export const VenueLine: React.FC<{ lead: string; punch: string; duration: number }> = ({
  lead,
  punch,
  duration,
}) => {
  const frame = useCurrentFrame();
  const rule = ease(frame, 16, 14, Easing.inOut(Easing.cubic));

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(80% 26% at 50% 50%, rgba(13,9,7,0.6) 0%, rgba(13,9,7,0.2) 60%, rgba(13,9,7,0) 100%)",
          opacity: ease(frame, 0, 12) * (1 - ease(frame, duration - 12, 12)),
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          textShadow: SHADOW,
          ...exitStyle(frame, duration - 12, 12),
        }}
      >
        <Rise frame={frame} start={3} dur={16}>
          <div
            style={{
              fontFamily: font.serif,
              fontStyle: "italic",
              fontSize: 106,
              lineHeight: 1,
              color: palette.paper,
              whiteSpace: "nowrap",
            }}
          >
            {lead}
          </div>
        </Rise>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 8 }}>
          <div style={{ width: 90 * rule, height: 2, background: palette.amber }} />
          <Rise frame={frame} start={12}>
            <div
              style={{
                fontFamily: font.sans,
                fontWeight: 600,
                fontSize: 54,
                letterSpacing: "0.36em",
                marginLeft: "0.36em",
                color: palette.amber,
                whiteSpace: "nowrap",
              }}
            >
              {punch.toUpperCase()}
            </div>
          </Rise>
          <div style={{ width: 90 * rule, height: 2, background: palette.amber }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
