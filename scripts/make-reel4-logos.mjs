// Lifts The Japanese sign out of its photo so it can sit on the reel's footage.
//
//   node scripts/make-reel4-logos.mjs
//
// public/Reel_4_content/venue-logo.png is a night photo of the round lit sign
// on a red-lit textured wall. The sign itself is a near-black disc, so the
// lettering and the white ring are effectively "light on black": luminance is
// the matte. Two assets come out of it, both tightly cropped to the ring:
//
//   public/reel4/japanese-mark.png   lettering + ring only, alpha-keyed and
//                                    un-premultiplied, so the glow lands on
//                                    whatever footage is behind it
//   public/reel4/japanese-badge.png  the whole disc with a feathered edge, for
//                                    bright backgrounds where a keyed mark
//                                    would wash out
//
// The Duncit wordmark is already lifted by scripts/make-wordmark.mjs.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "public/Reel_4_content/venue-logo.png");
const OUT_DIR = path.join(ROOT, "public/reel4");

function decodePng(buf) {
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
};

const encodeRgba = (width, height, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const img = decodePng(readFileSync(SRC));
const { width: W, height: H, channels: C, data } = img;
const px = (x, y) => {
  const i = (y * W + x) * C;
  return [data[i], data[i + 1], data[i + 2]];
};
const minC = (x, y) => Math.min(...px(x, y));
const maxC = (x, y) => Math.max(...px(x, y));

// --- find the ring -----------------------------------------------------------
// The ring is the only near-white thing at the disc's extremes. Its centre line
// is found per scan line as the midpoint of the bright run.
const brightRun = (coords) => {
  const hits = coords.filter(([x, y]) => minC(x, y) > 170);
  if (!hits.length) return null;
  const mid = hits.reduce((s, [x, y]) => [s[0] + x, s[1] + y], [0, 0]);
  return [mid[0] / hits.length, mid[1] / hits.length];
};

const scanRow = (y, x0, x1) =>
  brightRun(Array.from({ length: x1 - x0 }, (_, i) => [x0 + i, y]));
const scanCol = (x, y0, y1) =>
  brightRun(Array.from({ length: y1 - y0 }, (_, i) => [x, y0 + i]));

// Rough centre from the photo, refined twice.
let cx = 684;
let cy = 300;
let rx = 0;
let ry = 0;
for (let pass = 0; pass < 3; pass++) {
  const left = scanRow(Math.round(cy), Math.round(cx - 330), Math.round(cx - 200));
  const right = scanRow(Math.round(cy), Math.round(cx + 200), Math.round(cx + 330));
  const top = scanCol(Math.round(cx), 0, Math.round(cy - 200));
  const bottom = scanCol(Math.round(cx), Math.round(cy + 200), H);
  cx = (left[0] + right[0]) / 2;
  rx = (right[0] - left[0]) / 2;
  if (top && bottom) {
    cy = (top[1] + bottom[1]) / 2;
    ry = (bottom[1] - top[1]) / 2;
  } else if (top) {
    ry = rx;
    cy = top[1] + ry;
  }
}
const R = (rx + ry) / 2;
console.log({ cx: +cx.toFixed(1), cy: +cy.toFixed(1), rx: +rx.toFixed(1), ry: +ry.toFixed(1) });

// --- matte -------------------------------------------------------------------
// Inside the disc the background sits around 20-35 in every channel. Keying on
// the brightest channel keeps the orange "JAPANESE" as solid as the white.
const LO = 44;
const HI = 150;
/** Radius (past the ring centre line) where the keyed mark fades out. */
const RING_OUT = 16;
const FEATHER = 6;

const PAD = RING_OUT + 4;
const x0 = Math.max(0, Math.floor(cx - R - PAD));
const y0 = Math.max(0, Math.floor(cy - R - PAD));
const x1 = Math.min(W - 1, Math.ceil(cx + R + PAD));
const y1 = Math.min(H - 1, Math.ceil(cy + R + PAD));
// Square canvas so the ring is centred even if the photo cropped its bottom.
const size = Math.ceil(2 * (R + PAD));
const ox = Math.round(cx - size / 2);
const oy = Math.round(cy - size / 2);

const smooth = (e0, e1, v) => {
  const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const mark = Buffer.alloc(size * size * 4);
const badge = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const sx = ox + x;
    const sy = oy + y;
    const di = (y * size + x) * 4;
    if (sx < x0 || sx > x1 || sy < y0 || sy > y1) continue;
    const d = Math.hypot(sx - cx, sy - cy);
    const [r, g, b] = px(sx, sy);
    const m = Math.max(r, g, b);

    // Keyed mark: luminance matte, clipped to the ring's outer glow.
    const edge = 1 - smooth(R + RING_OUT - FEATHER, R + RING_OUT, d);
    const a = smooth(LO, HI, m) * edge;
    if (a > 0.002) {
      // Un-premultiply against the black disc, so a half-covered glow pixel
      // becomes a full-colour pixel at half opacity.
      const k = Math.max(a, m / 255);
      mark[di] = Math.min(255, Math.round(r / k));
      mark[di + 1] = Math.min(255, Math.round(g / k));
      mark[di + 2] = Math.min(255, Math.round(b / k));
      mark[di + 3] = Math.round(a * 255);
    }

    // Badge: the disc as photographed, feathered just outside the ring.
    const ba = 1 - smooth(R + RING_OUT - FEATHER * 2, R + RING_OUT, d);
    if (ba > 0) {
      badge[di] = r;
      badge[di + 1] = g;
      badge[di + 2] = b;
      badge[di + 3] = Math.round(ba * 255);
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, "japanese-mark.png"), encodeRgba(size, size, mark));
writeFileSync(path.join(OUT_DIR, "japanese-badge.png"), encodeRgba(size, size, badge));
console.log(JSON.stringify({ size, ringRadius: +R.toFixed(1), out: "public/reel4/japanese-{mark,badge}.png" }));
