import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { SHOTS, proxyFile, proxySize, spanOf } from "./shots";
import { HEIGHT, WIDTH, clamp01, mix } from "./theme";

/** Slow, settling camera: most of the move early, then a long glide. */
const CAMERA = Easing.bezier(0.33, 0.1, 0.25, 1);

/**
 * One shot of the cut list, mounted in a Sequence that starts at its first
 * visible frame. Photos get a slow push-in toward their subject; video
 * proxies already have their span and speed baked in, so they just play.
 */
export const ShotLayer: React.FC<{ index: number }> = ({ index }) => {
  const shot = SHOTS[index];
  const [first, end] = spanOf(index);
  const local = useCurrentFrame();
  const compFrame = first + local;

  // --- camera ------------------------------------------------------------------
  const t = interpolate(compFrame, [first, Math.max(first + 1, end - 1)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CAMERA,
  });
  const size = proxySize(shot);
  const cover = Math.max(WIDTH / size.w, HEIGHT / size.h);
  const bw = size.w * cover;
  const bh = size.h * cover;
  const s = mix(shot.zoom[0], shot.zoom[1], t);

  // Lean toward the subject, never past the frame edge.
  const [fx, fy] = shot.focus;
  const halfX = WIDTH / (2 * bw * s);
  const halfY = HEIGHT / (2 * bh * s);
  const cx = halfX >= 0.5 ? 0.5 : Math.min(1 - halfX, Math.max(halfX, fx));
  const cy = halfY >= 0.5 ? 0.5 : Math.min(1 - halfY, Math.max(halfY, fy));
  const tx = -(cx - 0.5) * bw * s;
  const ty = -(cy - 0.5) * bh * s;

  // --- dissolve in: opacity with a breath of defocus ------------------------------
  const d = shot.dissolve ?? 0;
  const inP = d > 0 ? Easing.inOut(Easing.quad)(clamp01((local + 1) / (d + 1))) : 1;
  const defocus = (1 - inP) * 10;

  const g = shot.grade ?? {};
  const filter = [
    defocus > 0.3 ? `blur(${defocus.toFixed(2)}px)` : "",
    `brightness(${(g.bright ?? 1).toFixed(3)})`,
    `saturate(${(g.sat ?? 1).toFixed(3)})`,
    g.contrast ? `contrast(${g.contrast})` : "",
    g.warm ? `sepia(${(g.warm * 0.22).toFixed(3)})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const media: React.CSSProperties = {
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
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: inP, filter }}>
      {shot.kind === "photo" ? (
        <Img src={staticFile(proxyFile(index))} style={media} />
      ) : (
        <OffthreadVideo
          src={staticFile(proxyFile(index))}
          muted
          // Proxies are already SDR bt709.
          toneMapped={false}
          pauseWhenBuffering
          style={media}
        />
      )}
    </AbsoluteFill>
  );
};
