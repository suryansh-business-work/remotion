import React from "react";
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame } from "remotion";
import { clamp01, font, mix, palette } from "./theme";

/** public/duncit-wordmark.png — the white wordmark lifted off its red plate. */
const WORDMARK = staticFile("duncit-wordmark.png");
const WORDMARK_ASPECT = 983 / 268;

const ease = (frame: number, start: number, dur: number, fn = Easing.out(Easing.cubic)) =>
  fn(clamp01((frame - start) / dur));

const ivory = (a: number) => `rgba(246,238,227,${a.toFixed(3)})`;

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/**
 * Ivory paper washing in from the top or bottom edge — the poster's paper,
 * fading into the footage — so burgundy type can sit on it.
 */
const Veil: React.FC<{ side: "top" | "bottom"; reach: number; strength?: number; opacity: number }> = ({
  side,
  reach,
  strength = 0.9,
  opacity,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(${side === "top" ? "180deg" : "0deg"},
        ${ivory(strength)} 0%,
        ${ivory(strength * 0.86)} ${reach * 0.45}%,
        ${ivory(strength * 0.4)} ${reach * 0.78}%,
        ${ivory(0)} ${reach}%)`,
      opacity,
    }}
  />
);

/** A line that rises into place from behind an invisible edge (a masked reveal). */
const Rise: React.FC<{
  frame: number;
  start: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ frame, start, dur = 18, children, style }) => {
  const e = ease(frame, start, dur, Easing.bezier(0.2, 0.7, 0.2, 1));
  return (
    <div style={{ overflow: "hidden", padding: "0.06em 0.3em 0.16em", ...style }}>
      <div
        style={{
          transform: `translateY(${((1 - e) * 105).toFixed(2)}%)`,
          filter: e < 0.98 ? `blur(${((1 - e) * 6).toFixed(2)}px)` : undefined,
          opacity: clamp01(e * 1.4),
          whiteSpace: "nowrap",
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
    transform: `translateY(${(-30 * x).toFixed(1)}px)`,
    filter: `blur(${(8 * x).toFixed(2)}px)`,
    opacity: 1 - x,
  };
};

/** Fade-in that also fades out over the last `out` frames. */
const inOut = (frame: number, duration: number, inDur: number, out: number) =>
  ease(frame, 0, inDur, Easing.inOut(Easing.quad)) * (1 - ease(frame, duration - out, out, Easing.inOut(Easing.quad)));

/** A thin burgundy rule that draws out from its centre. */
const Rule: React.FC<{ width: number; progress: number; color?: string }> = ({
  width,
  progress,
  color = palette.burgundy,
}) => <div style={{ width: width * progress, height: 2, background: color, opacity: 0.75 }} />;

/** A tiny painted sprig: rule, petal, rule. */
const Sprig: React.FC<{ progress: number }> = ({ progress }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
    <Rule width={110} progress={progress} />
    <svg width={30} height={30} viewBox="-15 -15 30 30" style={{ transform: `scale(${progress}) rotate(${(1 - progress) * -60}deg)` }}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-7} rx={4.6} ry={7.5} fill={palette.rose} transform={`rotate(${a})`} />
      ))}
      <circle r={3.4} fill={palette.wine} />
    </svg>
    <Rule width={110} progress={progress} />
  </div>
);

/** Duncit's red plate with the white wordmark, as on the poster. */
export const DuncitPlate: React.FC<{ height: number }> = ({ height }) => {
  const markH = height * 0.56;
  return (
    <div
      style={{
        height,
        padding: `0 ${height * 0.34}px`,
        display: "flex",
        alignItems: "center",
        background: palette.duncit,
        borderRadius: height * 0.08,
        boxShadow: "0 8px 24px rgba(106,20,32,0.22)",
      }}
    >
      <Img
        src={WORDMARK}
        style={{ height: markH, width: markH * WORDMARK_ASPECT, maxWidth: "none", display: "block", marginTop: height * 0.02 }}
      />
    </div>
  );
};

const Column: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  top,
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 0,
      right: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

const kicker: React.CSSProperties = {
  fontFamily: font.sans,
  fontWeight: 500,
  fontSize: 28,
  letterSpacing: "0.42em",
  marginLeft: "0.42em",
  color: palette.wine,
};

// ---------------------------------------------------------------------------
// 0-3.2s  A cake. / A canvas. / Your creation.
// ---------------------------------------------------------------------------

export const HookWords: React.FC<{ lines: string[]; starts: number[]; duration: number }> = ({
  lines,
  starts,
  duration,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Veil side="top" reach={46} opacity={1 - ease(frame, duration - 10, 10)} />
      <Column top={190} style={exitStyle(frame, duration - 10, 10)}>
        {lines.map((line, k) => {
          const last = k === lines.length - 1;
          return (
            <Rise key={line} frame={frame} start={starts[k]} dur={16}>
              <div
                style={{
                  fontFamily: font.serif,
                  fontStyle: last ? "italic" : "normal",
                  fontWeight: last ? 500 : 400,
                  fontSize: last ? 118 : 104,
                  lineHeight: 1.06,
                  color: last ? palette.wine : palette.burgundy,
                }}
              >
                {line}
              </div>
            </Rise>
          );
        })}
      </Column>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3.2-7s  CAKE CANVAS — A Cake Painting Workshop
// ---------------------------------------------------------------------------

export const EventTitle: React.FC<{ title: string; workshop: string; duration: number }> = ({
  title,
  workshop,
  duration,
}) => {
  const frame = useCurrentFrame();
  const words = title.toUpperCase().split(" ");
  // The headline settles from loose tracking into the poster's tight set.
  const track = mix(0.09, 0.01, ease(frame, 8, 40, Easing.out(Easing.quad)));

  return (
    <AbsoluteFill>
      <Veil side="top" reach={60} strength={0.94} opacity={inOut(frame, duration, 12, 12)} />
      <Column top={170} style={exitStyle(frame, duration - 12, 12)}>
        <Rise frame={frame} start={4} dur={16}>
          <DuncitPlate height={66} />
        </Rise>
        <Rise frame={frame} start={9} dur={16} style={{ marginTop: 14 }}>
          <div style={kicker}>PRESENTS</div>
        </Rise>
        {words.map((w, k) => (
          <Rise key={w} frame={frame} start={13 + k * 6} dur={22} style={{ marginTop: k === 0 ? 4 : -46 }}>
            <div
              style={{
                fontFamily: font.serif,
                fontWeight: 500,
                fontSize: 200,
                lineHeight: 1.04,
                letterSpacing: `${track}em`,
                marginLeft: `${track}em`,
                color: palette.burgundy,
              }}
            >
              {w}
            </div>
          </Rise>
        ))}
        <div style={{ marginTop: 6 }}>
          <Sprig progress={ease(frame, 28, 18, Easing.inOut(Easing.cubic))} />
        </div>
        <Rise frame={frame} start={34} style={{ marginTop: 10 }}>
          <div style={{ fontFamily: font.serif, fontStyle: "italic", fontSize: 64, color: palette.wine }}>
            {workshop}
          </div>
        </Rise>
      </Column>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7-13s  experience phrases
// ---------------------------------------------------------------------------

export const Phrase: React.FC<{ index: number; text: string; duration: number }> = ({ index, text, duration }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Veil side="bottom" reach={33} strength={0.86} opacity={inOut(frame, duration, 8, 8)} />
      <Column top={1300} style={exitStyle(frame, duration - 8, 8)}>
        <Rise frame={frame} start={2} dur={14}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Rule width={56} progress={ease(frame, 2, 14)} />
            <div style={{ ...kicker, fontSize: 26 }}>{String(index).padStart(2, "0")}</div>
            <Rule width={56} progress={ease(frame, 2, 14)} />
          </div>
        </Rise>
        <Rise frame={frame} start={6} dur={18}>
          <div
            style={{
              fontFamily: font.serif,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 76,
              lineHeight: 1.1,
              color: palette.burgundy,
            }}
          >
            {text}
          </div>
        </Rise>
      </Column>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 13-17s  with SHUBHI WALIA — Fluff & Cup
// ---------------------------------------------------------------------------

export const ArtistTitle: React.FC<{ artist: string; brand: string; duration: number }> = ({
  artist,
  brand,
  duration,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Veil side="top" reach={48} strength={0.93} opacity={inOut(frame, duration, 12, 12)} />
      <Column top={220} style={exitStyle(frame, duration - 12, 12)}>
        <Rise frame={frame} start={6}>
          <div style={{ fontFamily: font.serif, fontStyle: "italic", fontSize: 64, color: palette.wine }}>with</div>
        </Rise>
        <Rise frame={frame} start={12} dur={22} style={{ marginTop: -16 }}>
          <div
            style={{
              fontFamily: font.serif,
              fontWeight: 500,
              fontSize: 112,
              letterSpacing: "0.04em",
              marginLeft: "0.04em",
              color: palette.burgundy,
            }}
          >
            {artist.toUpperCase()}
          </div>
        </Rise>
        <div style={{ marginTop: 2 }}>
          <Sprig progress={ease(frame, 26, 18, Easing.inOut(Easing.cubic))} />
        </div>
        <Rise frame={frame} start={32} style={{ marginTop: 6 }}>
          <div style={{ fontFamily: font.serif, fontStyle: "italic", fontSize: 80, color: palette.wine }}>{brand}</div>
        </Rise>
      </Column>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 17-21s  One Pourcent, Lucknow / Ticket ₹599
// ---------------------------------------------------------------------------

export const DetailsCard: React.FC<{ venue: string; city: string; price: string; duration: number }> = ({
  venue,
  city,
  price,
  duration,
}) => {
  const frame = useCurrentFrame();
  // The card unmasks from its bottom edge while it rises.
  const open = ease(frame, 2, 20, Easing.bezier(0.2, 0.7, 0.2, 1));
  const exit = ease(frame, duration - 12, 12, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill>
      <Veil side="top" reach={52} strength={0.55} opacity={inOut(frame, duration, 12, 12)} />
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 250,
          transform: `translateY(${((1 - open) * 50 - exit * 30).toFixed(1)}px)`,
          opacity: 1 - exit,
          filter: exit > 0 ? `blur(${(8 * exit).toFixed(1)}px)` : undefined,
          clipPath: `inset(${((1 - open) * 100).toFixed(2)}% -10% -10% -10%)`,
        }}
      >
        <div
          style={{
            position: "relative",
            background: `linear-gradient(170deg, ${palette.ivory} 0%, #F1E5D5 100%)`,
            borderRadius: 30,
            padding: "58px 40px 62px",
            boxShadow: "0 30px 70px rgba(42,25,21,0.35), 0 4px 14px rgba(42,25,21,0.18)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Printed inner frame. */}
          <div
            style={{
              position: "absolute",
              inset: 16,
              borderRadius: 20,
              border: "1.5px solid rgba(106,20,32,0.28)",
            }}
          />
          <Rise frame={frame} start={6}>
            <div style={kicker}>AT</div>
          </Rise>
          <Rise frame={frame} start={9} dur={18} style={{ marginTop: -6 }}>
            <div style={{ fontFamily: font.serif, fontWeight: 500, fontSize: 96, lineHeight: 1.08, color: palette.burgundy }}>
              {venue}
            </div>
          </Rise>
          <Rise frame={frame} start={13} style={{ marginTop: -14 }}>
            <div style={{ fontFamily: font.serif, fontStyle: "italic", fontSize: 60, color: palette.wine }}>{city}</div>
          </Rise>
          <div style={{ margin: "18px 0 22px" }}>
            <Sprig progress={ease(frame, 16, 16, Easing.inOut(Easing.cubic))} />
          </div>
          <Rise frame={frame} start={19}>
            <div style={kicker}>TICKET</div>
          </Rise>
          <Rise frame={frame} start={22} dur={18} style={{ marginTop: -10 }}>
            <div style={{ fontFamily: font.serif, fontWeight: 500, fontSize: 150, lineHeight: 1.05, color: palette.burgundy }}>
              {price}
            </div>
          </Rise>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 21-25s  tagline, registration, Duncit
// ---------------------------------------------------------------------------

export const Closing: React.FC<{ tagline: string; register: string; cta: string }> = ({
  tagline,
  register,
  cta,
}) => {
  const frame = useCurrentFrame();
  // "Your cake. Your canvas. Your creation." -> one line per sentence.
  const lines = tagline.match(/[^.]+\.?/g)?.map((s) => s.trim()) ?? [tagline];
  const veil = ease(frame, 0, 14, Easing.inOut(Easing.quad));

  return (
    <AbsoluteFill>
      <Veil side="top" reach={42} strength={0.94} opacity={veil} />
      <Veil side="bottom" reach={36} strength={0.93} opacity={veil} />
      <Column top={200}>
        {lines.map((line, k) => (
          <Rise key={line} frame={frame} start={4 + k * 6} dur={18}>
            <div
              style={{
                fontFamily: font.serif,
                fontStyle: "italic",
                fontWeight: k === lines.length - 1 ? 500 : 400,
                fontSize: 96,
                lineHeight: 1.04,
                color: k === lines.length - 1 ? palette.wine : palette.burgundy,
              }}
            >
              {line}
            </div>
          </Rise>
        ))}
      </Column>
      <Column top={1262}>
        <Rise frame={frame} start={20}>
          <div style={kicker}>{register.toUpperCase()}</div>
        </Rise>
        <Rise frame={frame} start={24} dur={18} style={{ marginTop: -4 }}>
          <div
            style={{
              fontFamily: font.sans,
              fontWeight: 600,
              fontSize: 54,
              letterSpacing: "0.1em",
              marginLeft: "0.1em",
              color: palette.burgundy,
            }}
          >
            {cta.toUpperCase()}
          </div>
        </Rise>
        <div style={{ margin: "14px 0 20px" }}>
          <Sprig progress={ease(frame, 30, 16, Easing.inOut(Easing.cubic))} />
        </div>
        <Rise frame={frame} start={34} dur={18}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ ...kicker, fontSize: 24 }}>HOSTED BY</div>
            <DuncitPlate height={74} />
          </div>
        </Rise>
      </Column>
    </AbsoluteFill>
  );
};
