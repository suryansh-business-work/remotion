// Artistic reveal masks, built as SVG and handed to CSS `mask-image`.
//
// Each frame gets its own tiny data-URI SVG, so the reveal can be any shape
// that SVG can stroke or fill — a pencil scribble drawn along a path, or an
// ink blob blooming out — with rough, displaced edges instead of a clean wipe.
import { HEIGHT, WIDTH, hash } from "./theme";

const toUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** Roughens a mask's edge like graphite / wet paint on paper. */
const roughFilter = (id: string, seed: number, scale: number, freq: number) =>
  `<filter id='${id}' x='-10%' y='-10%' width='120%' height='120%'>` +
  `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' seed='${seed}' result='n'/>` +
  `<feDisplacementMap in='SourceGraphic' in2='n' scale='${scale}' xChannelSelector='R' yChannelSelector='G'/>` +
  `</filter>`;

/**
 * A loose, hand-drawn back-and-forth scribble covering the frame, top to
 * bottom. Neighbouring passes overlap by far more than the stroke's gaps, so
 * the frame is fully covered once the stroke is fully drawn.
 */
const SCRIBBLE_PATH = (() => {
  const passes = 7;
  const top = -120;
  const step = (HEIGHT + 240) / (passes - 1);
  let d = `M ${-260} ${top}`;
  for (let i = 1; i < passes; i++) {
    const y = top + step * i;
    const goingRight = i % 2 === 1;
    const x = goingRight ? WIDTH + 260 : -260;
    const wobble = (hash(i * 3.1) - 0.5) * 120;
    const c1x = goingRight ? WIDTH * 0.3 : WIDTH * 0.7;
    const c2x = goingRight ? WIDTH * 0.75 : WIDTH * 0.25;
    d += ` C ${c1x} ${y - step * 0.9 + wobble} ${c2x} ${y - step * 0.1 - wobble} ${x} ${y}`;
  }
  return d;
})();

/** Stroke width of the scribble; must exceed a pass spacing to leave no gaps. */
const SCRIBBLE_WIDTH = 560;

/** Mask for a scribble reveal. `p` 0..1 is how much of the stroke is drawn. */
export const scribbleMask = (p: number, seed: number) => {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${WIDTH} ${HEIGHT}' preserveAspectRatio='none'>` +
    `<defs>${roughFilter("r", seed, 70, 0.018)}</defs>` +
    `<g filter='url(#r)'>` +
    `<path d='${SCRIBBLE_PATH}' fill='none' stroke='white' stroke-width='${SCRIBBLE_WIDTH}' ` +
    `stroke-linecap='round' stroke-linejoin='round' pathLength='1000' ` +
    `stroke-dasharray='1000 1000' stroke-dashoffset='${((1 - p) * 1000).toFixed(2)}'/>` +
    `</g></svg>`;
  return toUrl(svg);
};

/** The graphite line the scribble leaves at its drawing tip. */
export const scribbleTip = () => SCRIBBLE_PATH;

/**
 * Mask for an ink / paint bloom from (cx, cy), in frame fractions. `p` 0..1.
 * A wobbling blob grows past the frame's far corner, with droplets thrown
 * ahead of its edge.
 */
export const splashMask = (p: number, cx: number, cy: number, seed: number) => {
  const ox = cx * WIDTH;
  const oy = cy * HEIGHT;
  const reach = Math.hypot(Math.max(ox, WIDTH - ox), Math.max(oy, HEIGHT - oy));
  // Past 1.0 the lobes' inner dips still clear the corners.
  const radius = reach * 1.45 * p;

  const points = 48;
  let d = "";
  for (let k = 0; k <= points; k++) {
    const a = (k / points) * Math.PI * 2;
    const r =
      radius *
      (1 +
        0.16 * Math.sin(3 * a + seed) +
        0.09 * Math.sin(7 * a + seed * 1.7) +
        0.05 * Math.sin(13 * a + seed * 2.3));
    const x = ox + Math.cos(a) * r;
    const y = oy + Math.sin(a) * r;
    d += `${k === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }

  let drops = "";
  for (let k = 0; k < 14; k++) {
    const a = hash(seed * 10 + k) * Math.PI * 2;
    const lead = 1.05 + hash(seed * 20 + k) * 0.35;
    const size = (18 + hash(seed * 30 + k) * 46) * Math.min(1, p * 3);
    const x = ox + Math.cos(a) * radius * lead;
    const y = oy + Math.sin(a) * radius * lead;
    drops += `<circle cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' r='${size.toFixed(1)}'/>`;
  }

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${WIDTH} ${HEIGHT}' preserveAspectRatio='none'>` +
    `<defs>${roughFilter("r", Math.round(seed), 46, 0.03)}</defs>` +
    `<g filter='url(#r)' fill='white'><path d='${d}Z'/>${drops}</g></svg>`;
  return toUrl(svg);
};
