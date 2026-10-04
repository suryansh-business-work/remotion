import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { CLIPS, type Shot } from "./clips";
import { BEAT, FPS, HEIGHT, WIDTH, drift, mix } from "./theme";

/** Decelerating camera move — fast off the cut, then settling. */
const CAMERA = Easing.bezier(0.19, 0.72, 0.3, 1);

/**
 * Chains a shot's speed ramp into concrete segments. Each step gets its own
 * `<OffthreadVideo>` with a `trimBefore` picked up exactly where the previous
 * step left off, so a 1.7x -> 0.35x ramp plays as one continuous move instead
 * of four jump cuts.
 */
const segmentsFor = (shot: Shot) => {
  const steps = shot.ramp ?? [
    { rate: shot.rate ?? 1, d: shot.durationInFrames },
  ];
  let from = 0;
  let sourceSec = shot.at;
  return steps.map((step) => {
    const seg = {
      from,
      d: step.d,
      rate: step.rate,
      trimBefore: Math.round(sourceSec * FPS),
    };
    from += step.d;
    sourceSec += (step.d * step.rate) / FPS;
    return seg;
  });
};

/**
 * Horizontal-only Gaussian blur. Whip pans smear across the frame, not down
 * it, and an isotropic CSS `blur()` reads as an out-of-focus lens instead.
 */
const SmearFilter: React.FC<{ id: string; px: number }> = ({ id, px }) => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      <filter
        id={id}
        x="-30%"
        y="-10%"
        width="160%"
        height="120%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation={`${px} ${px * 0.12}`} />
      </filter>
    </defs>
  </svg>
);

export const ShotLayer: React.FC<{ shot: Shot; index: number }> = ({
  shot,
  index,
}) => {
  const frame = useCurrentFrame();
  const clip = CLIPS[shot.clip];
  const d = shot.durationInFrames;

  // 0 -> 1 across the shot, eased into a camera move.
  const t = d <= 1 ? 1 : interpolate(frame, [0, d - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA,
  });

  // --- whip smear on the incoming / outgoing edge --------------------------
  const smearIn = shot.blurIn
    ? interpolate(frame, [0, 7], [shot.blurIn, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      })
    : 0;
  const smearOut = shot.blurOut
    ? interpolate(frame, [d - 8, d - 1], [0, shot.blurOut], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      })
    : 0;
  const smear = Math.max(smearIn, smearOut);

  // --- framing -------------------------------------------------------------
  const cover = Math.max(WIDTH / clip.width, HEIGHT / clip.height);
  const baseW = clip.width * cover;
  const baseH = clip.height * cover;

  // A hair of extra scale under the smear so the blur's soft edge stays
  // outside the 1080x1920 crop instead of fringing into it.
  const smearZoom = 1 + smear * 0.0065;
  // Barely-there swell on every beat: the frame breathes with the track.
  const beatPhase = ((frame + shot.from) % BEAT) / BEAT;
  const pulse = 1 + 0.005 * Math.pow(1 - beatPhase, 5);

  const zoom = mix(shot.zoom[0], shot.zoom[1], t) * smearZoom * pulse;

  const overflowX = baseW * zoom - WIDTH;
  const overflowY = baseH * zoom - HEIGHT;
  const panT = shot.pan ? mix(shot.pan[0], shot.pan[1], t) : 0;
  const tiltT = shot.tilt ? mix(shot.tilt[0], shot.tilt[1], t) : 0;

  // Handheld. Small, continuous, and seeded per shot so no two cuts drift
  // the same way.
  const amp = (shot.shake ?? 1) * 5.5;
  const seed = index * 7.13;
  const shakeX = drift(frame, seed, 1) * amp;
  const shakeY = drift(frame, seed + 3.3, 0.86) * amp * 0.8;
  const shakeRot = drift(frame, seed + 9.1, 0.7) * (shot.shake ?? 1) * 0.28;

  // The whip also kicks the frame sideways, otherwise the smear reads as a
  // focus pull rather than as camera movement.
  const kick = smearIn * 1.5 - smearOut * 1.6;

  const tx = (panT * overflowX) / 2 + shakeX + kick;
  const ty = (tiltT * overflowY) / 2 + shakeY;

  const filterId = `smear-${index}`;

  const video = (extra?: React.CSSProperties) => {
    const style: React.CSSProperties = {
      position: "absolute",
      left: (WIDTH - baseW) / 2,
      top: (HEIGHT - baseH) / 2,
      width: baseW,
      height: baseH,
      // Tailwind preflight caps media at 100% width, which would undo the
      // deliberately oversized frame.
      maxWidth: "none",
      maxHeight: "none",
      transform: `translate(${tx}px, ${ty}px) scale(${zoom}) rotate(${shakeRot}deg)`,
      transformOrigin: "50% 50%",
      willChange: "transform",
      ...extra,
    };
    return segmentsFor(shot).map((seg, i) => (
      <Sequence
        key={i}
        from={seg.from}
        durationInFrames={seg.d}
        layout="none"
        name={`${shot.clip} x${seg.rate}`}
      >
        <OffthreadVideo
          src={staticFile(clip.src)}
          trimBefore={seg.trimBefore}
          playbackRate={seg.rate}
          muted
          // Proxies are already SDR bt709; skip the compositor's tone mapper.
          toneMapped={false}
          pauseWhenBuffering
          style={style}
        />
      </Sequence>
    ));
  };

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: "#000",
        filter: shot.exposure ? `brightness(${shot.exposure})` : undefined,
      }}
    >
      {smear > 0.4 ? <SmearFilter id={filterId} px={smear} /> : null}
      <AbsoluteFill
        style={{
          overflow: "hidden",
          filter: smear > 0.4 ? `url(#${filterId})` : undefined,
        }}
      >
        {video()}
      </AbsoluteFill>

      {/* Screen-blended glow copy: highlights bleed the way they do on a
          fast lens wide open. Only mounted when the shot asks for it. */}
      {shot.bloom ? (
        <AbsoluteFill
          style={{
            overflow: "hidden",
            mixBlendMode: "screen",
            opacity: shot.bloom,
            filter: "blur(26px) brightness(1.45) saturate(1.25)",
          }}
        >
          {video()}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
