import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH, hash, palette } from "./theme";

/** Frames the sweep takes; the sheet fully covers the frame at the midpoint. */
export const PAPER_FRAMES = 20;

const SHEET_W = 2300;
const SHEET_H = 2700;
const TILT = -12;
const TRAVEL = 2700;

/** A torn vertical edge: jagged, with a few bigger bites. */
const tornEdge = (x: number, seed: number, dir: 1 | -1) => {
  const pts: string[] = [];
  const step = 34;
  for (let y = -SHEET_H / 2; y <= SHEET_H / 2; y += step) {
    const k = y / step;
    const jag = hash(seed + k * 1.31) * 26;
    const bite = hash(seed * 3 + Math.floor(k / 5)) > 0.8 ? hash(seed + k) * 40 : 0;
    pts.push(`${(x + dir * (jag + bite)).toFixed(1)},${y}`);
  }
  return pts;
};

/**
 * A sheet of torn paper sweeping across a cut, covering the frame completely
 * on the cut itself. Mount it in a Sequence starting PAPER_FRAMES / 2 before
 * the cut.
 */
export const PaperWipe: React.FC<{ seed: number }> = ({ seed }) => {
  const frame = useCurrentFrame();
  const p = Easing.inOut(Easing.cubic)(Math.min(1, frame / PAPER_FRAMES));
  const x = TRAVEL * (1 - 2 * p);

  const left = tornEdge(-SHEET_W / 2, seed, -1);
  const right = tornEdge(SHEET_W / 2, seed + 50, 1).reverse();
  const outline = [...left, ...right].join(" ");

  const id = `paper-${seed}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          {/* Paper tooth: low-contrast mottling + fibres. */}
          <filter id={`${id}-tex`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed={seed} result="n" />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 -1.4 0.9"
              result="speck"
            />
            <feComposite in="speck" in2="SourceGraphic" operator="in" result="speckIn" />
            <feBlend in="speckIn" in2="SourceGraphic" mode="multiply" />
          </filter>
          <linearGradient id={`${id}-shade`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.16" />
            <stop offset="0.06" stopColor="#000" stopOpacity="0" />
            <stop offset="0.94" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <g transform={`translate(${(WIDTH / 2 + x).toFixed(1)} ${HEIGHT / 2}) rotate(${TILT})`}>
          {/* Cast shadow on the footage underneath. */}
          <polygon
            points={outline}
            fill="#000"
            opacity={0.35}
            transform="translate(26 18)"
            style={{ filter: "blur(18px)" }}
          />
          <polygon points={outline} fill={palette.paper} filter={`url(#${id}-tex)`} />
          {/* Edges curl away from the light a little. */}
          <polygon points={outline} fill={`url(#${id}-shade)`} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
