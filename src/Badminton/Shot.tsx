import React from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  OffthreadVideo,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  proxyFile,
  proxyStartSec,
  sourceSecAt,
  type Shot,
  type Transition,
} from "./cuts";
import { ACT, BAR, BEAT, FPS, HEIGHT, WIDTH, drift, mix } from "./theme";

/** Frames each side of a cut that a transition occupies. */
const HALF: Record<Transition["kind"], number> = {
  cut: 0,
  slam: 9,
  whip: 6,
  zoom: 6,
  punch: 5,
  spin: 7,
  blur: 5,
  glitch: 5,
};

/** Transitions that only have an entrance; the outgoing shot just cuts. */
const ENTER_ONLY = new Set<Transition["kind"]>(["slam", "punch", "cut"]);

type Look = {
  tx: number;
  ty: number;
  scale: number;
  rot: number;
  /** Directional smear, px. */
  smearX: number;
  smearY: number;
  /** Isotropic defocus, px. */
  defocus: number;
  bright: number;
  /** RGB split offset, px. */
  rgb: number;
};

const NEUTRAL: Look = {
  tx: 0, ty: 0, scale: 1, rot: 0, smearX: 0, smearY: 0, defocus: 0, bright: 1, rgb: 0,
};

const WHIP_TRAVEL = 280;
const WHIP_SMEAR = 95;
const SPIN_DEG = 28;

/** Camera swing direction -> which way the image content travels. */
const whipVector = (dir: "left" | "right" | "up" | "down") =>
  dir === "right" ? [-1, 0] : dir === "left" ? [1, 0] : dir === "up" ? [0, 1] : [0, -1];

/** Scale a portrait frame needs so that rotating it never exposes a corner. */
const rotationCover = (deg: number) => {
  const r = (Math.abs(deg) * Math.PI) / 180;
  return Math.cos(r) + (HEIGHT / WIDTH) * Math.sin(r);
};

/**
 * `p` runs 1 -> 0 across the entrance (1 = the cut frame). The incoming shot
 * picks up exactly the motion the outgoing one left on: same travel direction,
 * same spin direction, same blur.
 */
const enterLook = (t: Transition, p: number, rnd: number): Partial<Look> => {
  const e = p * p;
  switch (t.kind) {
    case "slam":
      return { scale: 1 + 0.6 * e, defocus: 18 * e, bright: 1 + 1.1 * e };
    case "whip": {
      const [vx, vy] = whipVector(t.dir);
      return {
        tx: -vx * WHIP_TRAVEL * e,
        ty: -vy * WHIP_TRAVEL * e,
        smearX: vx ? WHIP_SMEAR * Math.pow(p, 1.5) : 0,
        smearY: vy ? WHIP_SMEAR * Math.pow(p, 1.5) : 0,
        scale: 1 + 0.16 * e,
      };
    }
    case "zoom":
      return { scale: 1 + 0.65 * e, defocus: 20 * e, bright: 1 + 0.3 * e };
    case "punch":
      return { scale: 1 + 0.24 * p * p * p, bright: 1 + 0.3 * p };
    case "spin": {
      const rot = -t.dir * SPIN_DEG * e;
      return { rot, scale: rotationCover(rot) * (1 + 0.12 * e), defocus: 14 * e };
    }
    case "blur":
      return { defocus: 26 * e, bright: 1 + 0.08 * e, scale: 1 + 0.05 * e };
    case "glitch":
      return {
        rgb: 30 * p,
        tx: (rnd - 0.5) * 70 * p,
        scale: 1 + 0.05 * p,
        bright: 1 + 0.15 * p,
      };
    default:
      return {};
  }
};

/** `q` runs 0 -> 1 across the exit (1 = the last frame before the cut). */
const exitLook = (t: Transition, q: number): Partial<Look> => {
  const e = q * q;
  switch (t.kind) {
    case "whip": {
      const [vx, vy] = whipVector(t.dir);
      return {
        tx: vx * WHIP_TRAVEL * e,
        ty: vy * WHIP_TRAVEL * e,
        smearX: vx ? WHIP_SMEAR * e : 0,
        smearY: vy ? WHIP_SMEAR * e : 0,
        scale: 1 + 0.16 * e,
      };
    }
    case "zoom":
      return { scale: 1 + 0.9 * e, defocus: 22 * e, bright: 1 + 0.35 * e };
    case "spin": {
      const rot = t.dir * SPIN_DEG * e;
      return { rot, scale: rotationCover(rot) * (1 + 0.12 * e), defocus: 14 * e };
    }
    case "blur":
      return { defocus: 26 * e, bright: 1 + 0.15 * e, scale: 1 + 0.04 * e };
    case "glitch":
      return { rgb: 20 * e };
    default:
      return {};
  }
};

const combine = (a: Look, b: Partial<Look>): Look => ({
  tx: a.tx + (b.tx ?? 0),
  ty: a.ty + (b.ty ?? 0),
  scale: a.scale * (b.scale ?? 1),
  rot: a.rot + (b.rot ?? 0),
  smearX: Math.max(a.smearX, b.smearX ?? 0),
  smearY: Math.max(a.smearY, b.smearY ?? 0),
  defocus: Math.max(a.defocus, b.defocus ?? 0),
  bright: a.bright * (b.bright ?? 1),
  rgb: Math.max(a.rgb, b.rgb ?? 0),
});

/** How hard the edit is driving at a composition frame; scales beat pulses. */
const drive = (frame: number) =>
  frame < ACT.build
    ? 0.6
    : frame < ACT.intensity
      ? 0.5
      : frame < ACT.peak
        ? 0.85
        : 1;

/** Decelerating camera move — quick off the cut, then settling. */
const CAMERA = Easing.bezier(0.2, 0.7, 0.3, 1);

export const ShotLayer: React.FC<{
  shot: Shot;
  index: number;
  /** The following shot's entrance, which this shot's exit mirrors. */
  next?: Transition;
  /** Size of the proxy frame, px. */
  frameSize: { w: number; h: number };
}> = ({ shot, index, next, frameSize }) => {
  const f = useCurrentFrame();
  const d = shot.durationInFrames;
  const compFrame = shot.from + f;

  // --- the base camera ------------------------------------------------------
  const t = interpolate(f, [0, Math.max(1, d - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA,
  });

  const cover = Math.max(WIDTH / frameSize.w, HEIGHT / frameSize.h);
  const bw = frameSize.w * cover;
  const bh = frameSize.h * cover;

  // Racket contact: a hard kick that decays over a few frames.
  let impact = 0;
  for (const h of shot.hits ?? []) {
    if (f >= h) impact = Math.max(impact, Math.exp(-(f - h) / 2.6));
  }

  // Every beat breathes; bar lines hit harder.
  const sinceBeat = compFrame % BEAT;
  const beatPulse =
    Math.exp(-sinceBeat / 3) * (compFrame % BAR === sinceBeat ? 1.7 : 1) * drive(compFrame);

  const baseZoom = mix(shot.zoom[0], shot.zoom[1], t);
  let look: Look = {
    ...NEUTRAL,
    scale: baseZoom * (1 + 0.012 * beatPulse) * (1 + 0.06 * impact),
    bright: 1 + 0.14 * impact,
  };

  // --- transitions ----------------------------------------------------------
  const inLen = Math.min(HALF[shot.in.kind], Math.floor(d / 2));
  if (inLen > 0 && f < inLen) {
    const p = 1 - f / inLen;
    look = combine(look, enterLook(shot.in, p, random(`glitch-${index}-${f}`)));
  }
  if (next && !ENTER_ONLY.has(next.kind)) {
    const outLen = Math.min(HALF[next.kind], Math.floor(d / 2));
    const q = (f - (d - outLen) + 1) / outLen;
    if (q > 0) look = combine(look, exitLook(next, Math.min(1, q)));
  }

  // --- framing: lean toward the subject, never past the frame edge -----------
  const fx = shot.focusEnd ? mix(shot.focus[0], shot.focusEnd[0], t) : shot.focus[0];
  const fy = shot.focusEnd ? mix(shot.focus[1], shot.focusEnd[1], t) : shot.focus[1];
  const s = look.scale;
  const halfX = WIDTH / (2 * bw * s);
  const halfY = HEIGHT / (2 * bh * s);
  const cx = halfX >= 0.5 ? 0.5 : Math.min(1 - halfX, Math.max(halfX, fx));
  const cy = halfY >= 0.5 ? 0.5 : Math.min(1 - halfY, Math.max(halfY, fy));

  // Handheld drift, plus a burst of shake on contact.
  const amp = (shot.shake ?? 1) * 5 + impact * 16;
  const seed = index * 7.13;
  const shakeX = drift(compFrame, seed, 1 + impact * 3) * amp;
  const shakeY = drift(compFrame, seed + 3.3, 0.86 + impact * 3) * amp * 0.8;

  // Whip travel may overshoot the frame edge only by what the smear hides.
  const overflowX = Math.max(0, (bw * s - WIDTH) / 2 - Math.abs((cx - 0.5) * bw * s));
  const overflowY = Math.max(0, (bh * s - HEIGHT) / 2 - Math.abs((cy - 0.5) * bh * s));
  const clampTo = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
  const travelX = clampTo(look.tx, overflowX + look.smearX * 0.7);
  const travelY = clampTo(look.ty, overflowY + look.smearY * 0.7);

  const tx = -(cx - 0.5) * bw * s + travelX + shakeX;
  const ty = -(cy - 0.5) * bh * s + travelY + shakeY;

  // --- source time ----------------------------------------------------------
  const sourceFrame = (sourceSecAt(shot, f) - proxyStartSec(shot)) * FPS;

  const filterId = `shot-fx-${index}`;
  const smearOn = look.smearX > 0.5 || look.smearY > 0.5;
  const rgbOn = look.rgb > 0.5;

  const filters = [
    smearOn || rgbOn ? `url(#${filterId})` : "",
    look.defocus > 0.3 ? `blur(${look.defocus.toFixed(2)}px)` : "",
    Math.abs(look.bright - 1) > 0.005 ? `brightness(${look.bright.toFixed(3)})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      {smearOn || rgbOn ? (
        <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter
              id={filterId}
              x="-25%"
              y="-25%"
              width="150%"
              height="150%"
              colorInterpolationFilters="sRGB"
            >
              {smearOn ? (
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation={`${look.smearX.toFixed(1)} ${look.smearY.toFixed(1)}`}
                  result="smear"
                />
              ) : (
                <feOffset in="SourceGraphic" dx={0} dy={0} result="smear" />
              )}
              {rgbOn ? (
                <>
                  <feColorMatrix
                    in="smear"
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="r"
                  />
                  <feOffset in="r" dx={-look.rgb} dy={look.rgb * 0.25} result="ro" />
                  <feColorMatrix
                    in="smear"
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="g"
                  />
                  <feColorMatrix
                    in="smear"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                    result="b"
                  />
                  <feOffset in="b" dx={look.rgb} dy={-look.rgb * 0.25} result="bo" />
                  <feBlend in="ro" in2="g" mode="screen" result="rg" />
                  <feBlend in="rg" in2="bo" mode="screen" />
                </>
              ) : null}
            </filter>
          </defs>
        </svg>
      ) : null}
      <AbsoluteFill style={{ overflow: "hidden", filter: filters || undefined }}>
        <Freeze frame={sourceFrame}>
          <OffthreadVideo
            src={staticFile(proxyFile(index, shot))}
            muted
            // Proxies are already SDR bt709.
            toneMapped={false}
            pauseWhenBuffering
            style={{
              position: "absolute",
              left: (WIDTH - bw) / 2,
              top: (HEIGHT - bh) / 2,
              width: bw,
              height: bh,
              // Tailwind preflight caps media at 100% width.
              maxWidth: "none",
              maxHeight: "none",
              transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${look.rot.toFixed(3)}deg) scale(${s.toFixed(4)})`,
              transformOrigin: "50% 50%",
            }}
          />
        </Freeze>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
