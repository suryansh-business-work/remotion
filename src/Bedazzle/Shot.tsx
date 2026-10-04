import React from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  SHOTS,
  overlapOf,
  proxyFile,
  proxySize,
  proxyStartSec,
  sourceSecAt,
  spanOf,
  type Dir,
  type Transition,
} from "./cuts";
import { scribbleMask, splashMask } from "./masks";
import { ACT, BEAT, FPS, HEIGHT, WIDTH, clamp01, drift, mix } from "./theme";

/** Frames a mirrored / enter-only transition occupies each side of its cut. */
const HALF: Partial<Record<Transition["kind"], number>> = {
  open: 16,
  zoom: 6,
  whip: 6,
  sketch: 18,
};

type Look = {
  tx: number;
  ty: number;
  scale: number;
  smearX: number;
  smearY: number;
  defocus: number;
  bright: number;
  opacity: number;
  /** 0..1 amount of pencil-sketch treatment. */
  sketch: number;
};

const NEUTRAL: Look = {
  tx: 0, ty: 0, scale: 1, smearX: 0, smearY: 0, defocus: 0, bright: 1, opacity: 1, sketch: 0,
};

const WHIP_TRAVEL = 260;
const WHIP_SMEAR = 90;

/** Camera swing direction -> which way the image content travels. */
const whipVector = (dir: Dir) =>
  dir === "right" ? [-1, 0] : dir === "left" ? [1, 0] : dir === "up" ? [0, 1] : [0, -1];

/** `p` runs 1 -> 0 across the entrance (1 = the cut frame). */
const enterLook = (t: Transition, p: number): Partial<Look> => {
  const e = p * p;
  switch (t.kind) {
    case "open":
      return { opacity: 1 - Math.pow(p, 1.6), defocus: 22 * e, scale: 1 + 0.1 * e, bright: 1 - 0.35 * p };
    case "zoom":
      return { scale: 1 + 0.55 * e, defocus: 18 * e, bright: 1 + 0.25 * e };
    case "whip": {
      const [vx, vy] = whipVector(t.dir);
      return {
        tx: -vx * WHIP_TRAVEL * e,
        ty: -vy * WHIP_TRAVEL * e,
        smearX: vx ? WHIP_SMEAR * Math.pow(p, 1.5) : 0,
        smearY: vy ? WHIP_SMEAR * Math.pow(p, 1.5) : 0,
        scale: 1 + 0.14 * e,
      };
    }
    case "sketch":
      // Holds as a drawing for a beat, then the colour floods in.
      return { sketch: Easing.inOut(Easing.cubic)(clamp01(p * 1.6)), scale: 1 + 0.04 * p };
    default:
      return {};
  }
};

/** `q` runs 0 -> 1 across the exit (1 = the last frame before the cut). */
const exitLook = (t: Transition, q: number): Partial<Look> => {
  const e = q * q;
  switch (t.kind) {
    case "zoom":
      return { scale: 1 + 0.8 * e, defocus: 20 * e, bright: 1 + 0.3 * e };
    case "whip": {
      const [vx, vy] = whipVector(t.dir);
      return {
        tx: vx * WHIP_TRAVEL * e,
        ty: vy * WHIP_TRAVEL * e,
        smearX: vx ? WHIP_SMEAR * e : 0,
        smearY: vy ? WHIP_SMEAR * e : 0,
        scale: 1 + 0.14 * e,
      };
    }
    default:
      return {};
  }
};

const combine = (a: Look, b: Partial<Look>): Look => ({
  tx: a.tx + (b.tx ?? 0),
  ty: a.ty + (b.ty ?? 0),
  scale: a.scale * (b.scale ?? 1),
  smearX: Math.max(a.smearX, b.smearX ?? 0),
  smearY: Math.max(a.smearY, b.smearY ?? 0),
  defocus: Math.max(a.defocus, b.defocus ?? 0),
  bright: a.bright * (b.bright ?? 1),
  opacity: a.opacity * (b.opacity ?? 1),
  sketch: Math.max(a.sketch, b.sketch ?? 0),
});

/** Decelerating camera move — quick off the cut, then settling. */
const CAMERA = Easing.bezier(0.25, 0.6, 0.3, 1);

export const ShotLayer: React.FC<{ index: number }> = ({ index }) => {
  const shot = SHOTS[index];
  const next = SHOTS[index + 1];
  const [first, end] = spanOf(index);
  const [pre, post] = overlapOf(shot.in);

  // `f` is relative to the shot's cut and runs negative under an overlap.
  const local = useCurrentFrame();
  const compFrame = first + local;
  const f = compFrame - shot.from;
  const len = shot.to - shot.from;

  // --- base camera -----------------------------------------------------------
  const t = interpolate(compFrame, [first, Math.max(first + 1, end - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA,
  });
  const frameSize = proxySize(shot);
  const cover = Math.max(WIDTH / frameSize.w, HEIGHT / frameSize.h);
  const bw = frameSize.w * cover;
  const bh = frameSize.h * cover;

  // A gentle breath on every beat of the workshop, none over titles/brand.
  const inWorkshop = compFrame >= ACT.workshop && compFrame < ACT.venue;
  const sinceBeat = compFrame % BEAT;
  const pulse = inWorkshop ? Math.exp(-sinceBeat / 3) : 0;

  let look: Look = { ...NEUTRAL, scale: mix(shot.zoom[0], shot.zoom[1], t) * (1 + 0.01 * pulse) };

  // --- transitions -------------------------------------------------------------
  const inHalf = Math.min(HALF[shot.in.kind] ?? 0, Math.floor(len / 2));
  if (inHalf > 0 && f >= 0 && f < inHalf) {
    look = combine(look, enterLook(shot.in, 1 - f / inHalf));
  }
  if (next && (next.in.kind === "zoom" || next.in.kind === "whip")) {
    const outHalf = Math.min(HALF[next.in.kind] ?? 0, Math.floor(len / 2));
    const q = (f - (len - outHalf) + 1) / outHalf;
    if (q > 0) look = combine(look, exitLook(next.in, Math.min(1, q)));
  }

  // Overlap reveals: progress 0..1 across [cut - pre, cut + post].
  const reveal = pre + post > 0 ? clamp01((f + pre) / (pre + post)) : 1;
  let maskImage: string | undefined;
  if (reveal < 1) {
    if (shot.in.kind === "dissolve") {
      const e = Easing.inOut(Easing.quad)(reveal);
      look = combine(look, { opacity: e, defocus: (1 - e) * 8 });
    } else if (shot.in.kind === "scribble") {
      maskImage = scribbleMask(Easing.inOut(Easing.sin)(reveal), 7 + index);
    } else if (shot.in.kind === "splash") {
      const fx = shot.focusEnd ? shot.focusEnd[0] : shot.focus[0];
      const fy = shot.focusEnd ? shot.focusEnd[1] : shot.focus[1];
      maskImage = splashMask(Easing.out(Easing.cubic)(reveal), fx, fy, 3 + index * 1.37);
    }
  }

  // --- framing: lean toward the subject, never past the frame edge -----------
  const fx = shot.focusEnd ? mix(shot.focus[0], shot.focusEnd[0], t) : shot.focus[0];
  const fy = shot.focusEnd ? mix(shot.focus[1], shot.focusEnd[1], t) : shot.focus[1];
  const s = look.scale;
  const halfX = WIDTH / (2 * bw * s);
  const halfY = HEIGHT / (2 * bh * s);
  const cx = halfX >= 0.5 ? 0.5 : Math.min(1 - halfX, Math.max(halfX, fx));
  const cy = halfY >= 0.5 ? 0.5 : Math.min(1 - halfY, Math.max(halfY, fy));

  const amp = (shot.shake ?? 1) * 4;
  const seed = index * 7.13;
  const shakeX = drift(compFrame, seed) * amp;
  const shakeY = drift(compFrame, seed + 3.3, 0.86) * amp * 0.8;

  const overflowX = Math.max(0, (bw * s - WIDTH) / 2 - Math.abs((cx - 0.5) * bw * s));
  const overflowY = Math.max(0, (bh * s - HEIGHT) / 2 - Math.abs((cy - 0.5) * bh * s));
  const clampTo = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
  const travelX = clampTo(look.tx, overflowX + look.smearX * 0.7);
  const travelY = clampTo(look.ty, overflowY + look.smearY * 0.7);

  const tx = -(cx - 0.5) * bw * s + travelX + shakeX;
  const ty = -(cy - 0.5) * bh * s + travelY + shakeY;

  // --- source time -------------------------------------------------------------
  const sourceFrame = Math.max(0, (sourceSecAt(shot, f) - proxyStartSec(index)) * FPS);

  // --- filters -----------------------------------------------------------------
  const filterId = `bz-fx-${index}`;
  const smearOn = look.smearX > 0.5 || look.smearY > 0.5;
  const sketchOn = look.sketch > 0.01;
  const g = shot.grade ?? {};
  const filters = [
    smearOn || sketchOn ? `url(#${filterId})` : "",
    look.defocus > 0.3 ? `blur(${look.defocus.toFixed(2)}px)` : "",
    `brightness(${((g.bright ?? 1) * look.bright).toFixed(3)})`,
    g.sat ? `saturate(${g.sat})` : "",
    g.contrast ? `contrast(${g.contrast})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        opacity: look.opacity,
        WebkitMaskImage: maskImage,
        maskImage,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
      }}
    >
      {smearOn || sketchOn ? (
        <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter
              id={filterId}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              {smearOn ? (
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation={`${look.smearX.toFixed(1)} ${look.smearY.toFixed(1)}`}
                  result="base"
                />
              ) : (
                <feOffset in="SourceGraphic" dx={0} dy={0} result="base" />
              )}
              {sketchOn ? (
                <>
                  {/* Graphite on warm paper: grey, edge-detect, invert. */}
                  <feColorMatrix in="base" type="saturate" values="0" result="grey" />
                  <feGaussianBlur in="grey" stdDeviation="1.1" result="soft" />
                  <feConvolveMatrix
                    in="soft"
                    order="3"
                    kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
                    preserveAlpha="true"
                    result="edges"
                  />
                  <feColorMatrix
                    in="edges"
                    type="matrix"
                    values="-5 0 0 0 0.96  -5 0 0 0 0.92  -5 0 0 0 0.85  0 0 0 1 0"
                    result="drawing"
                  />
                  <feComposite
                    in="drawing"
                    in2="base"
                    operator="arithmetic"
                    k1="0"
                    k2={look.sketch.toFixed(3)}
                    k3={(1 - look.sketch).toFixed(3)}
                    k4="0"
                  />
                </>
              ) : null}
            </filter>
          </defs>
        </svg>
      ) : null}
      <AbsoluteFill style={{ overflow: "hidden", filter: filters || undefined }}>
        <Freeze frame={sourceFrame}>
          <OffthreadVideo
            src={staticFile(proxyFile(index))}
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
              transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(4)})`,
              transformOrigin: "50% 50%",
            }}
          />
        </Freeze>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
