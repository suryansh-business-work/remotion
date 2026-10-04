// Lifts the white "duncit" wordmark off its red plate into a tightly-cropped
// RGBA PNG, so it can be placed on any background at full sharpness.
//
//   node scripts/make-wordmark.mjs public/duncit-logo.png public/duncit-wordmark.png
import { readFileSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

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
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const [inPath, outPath] = process.argv.slice(2);
const img = decodePng(readFileSync(inPath));
const { width, height, channels, data } = img;

// The plate is saturated red, the mark is white: green+blue carry the signal.
const LO = 70;
const HI = 238;
const alphaAt = (x, y) => {
  const i = y * width * channels + x * channels;
  const gb = Math.min(data[i + 1], data[i + 2]);
  return Math.max(0, Math.min(1, (gb - LO) / (HI - LO)));
};

let minX = width, maxX = -1, minY = height, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (alphaAt(x, y) > 0.08) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const PAD = 6;
minX = Math.max(0, minX - PAD);
minY = Math.max(0, minY - PAD);
maxX = Math.min(width - 1, maxX + PAD);
maxY = Math.min(height - 1, maxY + PAD);

const w = maxX - minX + 1;
const h = maxY - minY + 1;
const rgba = Buffer.alloc(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const a = alphaAt(minX + x, minY + y);
    const di = (y * w + x) * 4;
    rgba[di] = 255;
    rgba[di + 1] = 255;
    rgba[di + 2] = 255;
    rgba[di + 3] = Math.round(a * 255);
  }
}

writeFileSync(outPath, encodeRgba(w, h, rgba));
console.log(
  JSON.stringify({ out: outPath, w, h, aspect: (w / h).toFixed(4) }, null, 2),
);
