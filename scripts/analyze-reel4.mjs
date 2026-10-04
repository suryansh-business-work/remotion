// Scouts the Bedazzle workshop footage in public/Reel_4_content/videos.
//
//   node scripts/analyze-reel4.mjs <outDir> [clipFilter]
//
// For every clip this writes contact sheets (one labelled thumbnail per half
// second — per second for long clips — with a red motion bar under each) and a
// JSON motion curve. Unlike Reel 3 this footage is SDR phone video (Snapchat
// 1080p and 4K camera clips, all portrait), so no tone mapping is needed.
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const BIN = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc");
const FFMPEG = path.join(BIN, "ffmpeg.exe");
const FFPROBE = path.join(BIN, "ffprobe.exe");
const SRC_DIR = path.join(ROOT, "public/Reel_4_content/videos");
const OUT_DIR = path.resolve(process.argv[2] ?? "reel4-analysis");
const FILTER = process.argv[3];

const RATE = 10;
const TW = 162;
const TH = 288;
const COLS = 9;
const PER_SHEET = 54;

const run = (bin, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    const chunks = [];
    let err = "";
    p.stdout.on("data", (c) => chunks.push(c));
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) =>
      code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(err)),
    );
  });

const probe = async (file) => {
  const out = await run(FFPROBE, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate:format=duration",
    "-of", "json", file,
  ]);
  const j = JSON.parse(out.toString());
  const [num, den] = j.streams[0].r_frame_rate.split("/").map(Number);
  return { fps: +(num / den).toFixed(2), duration: Number(j.format.duration) };
};

// --- a 3x5 bitmap font, enough for "12 34.5" ------------------------------
const GLYPHS = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111",
  3: "111001111001111", 4: "101101111001001", 5: "111100111001111",
  6: "111100111101111", 7: "111001001001001", 8: "111101111101111",
  9: "111101111001111", ".": "000000000000010", " ": "000000000000000",
  "#": "101111101111101",
};
const drawText = (img, W, x0, y0, text, scale = 3) => {
  const cw = 4 * scale;
  for (let y = y0 - 2; y < y0 + 5 * scale + 2; y++)
    for (let x = x0 - 2; x < x0 + text.length * cw + 1; x++) {
      const i = (y * W + x) * 3;
      img[i] = img[i + 1] = img[i + 2] = 0;
    }
  [...text].forEach((ch, k) => {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++)
        if (g[r * 3 + c] === "1")
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const i = ((y0 + r * scale + dy) * W + x0 + k * cw + c * scale + dx) * 3;
              img[i] = 255; img[i + 1] = 235; img[i + 2] = 60;
            }
  });
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
};
const encodePng = (w, h, rgb) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const analyze = async (file, index) => {
  const name = path.basename(file, ".mp4");
  const meta = await probe(file);
  const raw = await run(FFMPEG, [
    "-hide_banner", "-loglevel", "error",
    "-i", file, "-vf", `scale=${TW}:${TH},format=rgb24`, "-r", String(RATE),
    "-c:v", "rawvideo", "-f", "image2pipe", "-",
  ]);
  const fsz = TW * TH * 3;
  const n = Math.floor(raw.length / fsz);
  const frame = (i) => raw.subarray(i * fsz, (i + 1) * fsz);

  // motion: mean |dLuma| on a 2px grid, 0..255; brightness: mean luma
  const motion = [0];
  const luma = [];
  for (let i = 0; i < n; i++) {
    const b = frame(i);
    const a = i > 0 ? frame(i - 1) : null;
    let s = 0, l = 0, c = 0;
    for (let y = 0; y < TH; y += 2)
      for (let x = 0; x < TW; x += 2) {
        const k = (y * TW + x) * 3;
        const lb = b[k] * 0.3 + b[k + 1] * 0.59 + b[k + 2] * 0.11;
        if (a) s += Math.abs(a[k] * 0.3 + a[k + 1] * 0.59 + a[k + 2] * 0.11 - lb);
        l += lb;
        c++;
      }
    if (a) motion.push(s / c);
    luma.push(l / c);
  }

  const step = meta.duration > 30 ? RATE : RATE / 2; // frames per thumb
  const stepSec = step / RATE;
  const thumbs = [];
  for (let i = 0; i < n; i += step) {
    const win = motion.slice(i, i + step);
    thumbs.push({ i, m: win.reduce((p, v) => p + v, 0) / win.length });
  }

  const pages = Math.ceil(thumbs.length / PER_SHEET);
  for (let pg = 0; pg < pages; pg++) {
    const list = thumbs.slice(pg * PER_SHEET, (pg + 1) * PER_SHEET);
    const BAR = 6;
    const cols = Math.min(COLS, list.length);
    const rows = Math.ceil(list.length / COLS);
    const SW = cols * (TW + 4);
    const SH = rows * (TH + BAR + 6) + 34;
    const sheet = Buffer.alloc(SW * SH * 3, 24);
    drawText(sheet, SW, 6, 6, `#${index}${pages > 1 ? " " + (pg + 1) : ""}`, 4);
    list.forEach(({ i, m }, t) => {
      const src = frame(Math.min(n - 1, i));
      const ox = (t % COLS) * (TW + 4) + 2;
      const oy = Math.floor(t / COLS) * (TH + BAR + 6) + 34;
      for (let y = 0; y < TH; y++) src.copy(sheet, ((oy + y) * SW + ox) * 3, y * TW * 3, (y + 1) * TW * 3);
      const bw = Math.min(TW, Math.round((m / 24) * TW));
      for (let y = oy + TH + 2; y < oy + TH + 2 + BAR; y++)
        for (let x = ox; x < ox + bw; x++) {
          const k = (y * SW + x) * 3;
          sheet[k] = 248; sheet[k + 1] = 44; sheet[k + 2] = 46;
        }
      drawText(sheet, SW, ox + 3, oy + 3, (i / RATE).toFixed(1), 2);
    });
    const suffix = pages > 1 ? `-p${pg + 1}` : "";
    writeFileSync(
      path.join(OUT_DIR, `sheet-${String(index).padStart(2, "0")}-${name}${suffix}.png`),
      encodePng(SW, SH, sheet),
    );
  }

  return {
    index, name, ...meta, stepSec,
    mean: +(thumbs.reduce((p, v) => p + v.m, 0) / thumbs.length).toFixed(2),
    luma: +(luma.reduce((p, v) => p + v, 0) / luma.length).toFixed(1),
    half: thumbs.map((v) => +v.m.toFixed(1)),
  };
};

mkdirSync(OUT_DIR, { recursive: true });
const files = readdirSync(SRC_DIR)
  .filter((f) => f.endsWith(".mp4"))
  .sort()
  .map((f, index) => ({ f, index }))
  .filter(({ f }) => !FILTER || f.includes(FILTER));
const results = [];
let next = 0;
const worker = async () => {
  while (next < files.length) {
    const { f, index } = files[next++];
    const t0 = Date.now();
    const r = await analyze(path.join(SRC_DIR, f), index);
    results.push(r);
    console.log(`#${index} ${f}  ${r.duration.toFixed(1)}s @${r.fps}  ${((Date.now() - t0) / 1000).toFixed(1)}s  motion ${r.mean}  luma ${r.luma}`);
  }
};
await Promise.all(Array.from({ length: 6 }, worker));
results.sort((a, b) => a.index - b.index);
writeFileSync(path.join(OUT_DIR, "motion.json"), JSON.stringify(results, null, 1));
console.log("wrote", OUT_DIR);
