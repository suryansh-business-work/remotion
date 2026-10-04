// Scouts the badminton footage in public/Reel_3_content/videos.
//
//   node scripts/analyze-reel3.mjs <outDir>
//
// For every clip this writes a contact sheet (one labelled thumbnail per half
// second, with a red motion bar under each) and a JSON motion curve. Motion is
// the mean absolute luma difference between consecutive 10fps frames — crude,
// but rallies, smashes and dives light it up while serves and walking don't.
//
// The originals are 4K60 HEVC Main-10 HDR10 (PQ). The bundled ffmpeg has no
// fps/tile filters and no raw muxer, so frames come out as rawvideo packets
// over image2pipe and everything else happens here in Node.
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const BIN = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc");
const FFMPEG = path.join(BIN, "ffmpeg.exe");
const FFPROBE = path.join(BIN, "ffprobe.exe");
const SRC_DIR = path.join(ROOT, "public/Reel_3_content/videos");
const OUT_DIR = path.resolve(process.argv[2] ?? "reel3-analysis");

const RATE = 10;
const LONG = 240;
const TONEMAP =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709," +
  "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24";

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
    "-show_entries", "stream=width,height,color_transfer:stream_side_data=rotation:format=duration",
    "-of", "json", file,
  ]);
  const j = JSON.parse(out.toString());
  const s = j.streams[0];
  const rot = Math.abs(s.side_data_list?.find((d) => "rotation" in d)?.rotation ?? 0);
  const portrait = rot === 90 ? s.width > s.height : s.height > s.width;
  return {
    portrait,
    hdr: s.color_transfer === "smpte2084",
    duration: Number(j.format.duration),
  };
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
  // black backing box
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
  const w = meta.portrait ? 136 : LONG;
  const h = meta.portrait ? LONG : 136;
  const vf = `scale=${w}:${h}${meta.hdr ? "," + TONEMAP : ",format=rgb24"}`;
  const raw = await run(FFMPEG, [
    "-hide_banner", "-loglevel", "error",
    ...(meta.hdr ? ["-hwaccel", "cuda"] : []),
    "-i", file, "-vf", vf, "-r", String(RATE),
    "-c:v", "rawvideo", "-f", "image2pipe", "-",
  ]);
  const fsz = w * h * 3;
  const n = Math.floor(raw.length / fsz);
  const frame = (i) => raw.subarray(i * fsz, (i + 1) * fsz);

  // motion: mean |dLuma| on a 2px grid, 0..255
  const motion = [0];
  for (let i = 1; i < n; i++) {
    const a = frame(i - 1), b = frame(i);
    let s = 0, c = 0;
    for (let y = 0; y < h; y += 2)
      for (let x = 0; x < w; x += 2) {
        const k = (y * w + x) * 3;
        const la = a[k] * 0.3 + a[k + 1] * 0.59 + a[k + 2] * 0.11;
        const lb = b[k] * 0.3 + b[k + 1] * 0.59 + b[k + 2] * 0.11;
        s += Math.abs(la - lb);
        c++;
      }
    motion.push(s / c);
  }
  const half = [];
  for (let i = 0; i < n; i += RATE / 2) {
    const win = motion.slice(i, i + RATE / 2);
    half.push(win.reduce((p, v) => p + v, 0) / win.length);
  }

  // contact sheet: 0.5s per thumb
  const cols = meta.portrait ? 8 : 5;
  const BAR = 8;
  const thumbs = half.length;
  const rows = Math.ceil(thumbs / cols);
  const SW = cols * (w + 4);
  const SH = rows * (h + BAR + 6) + 34;
  const sheet = Buffer.alloc(SW * SH * 3, 24);
  drawText(sheet, SW, 6, 6, `#${index}`, 4);
  for (let t = 0; t < thumbs; t++) {
    const src = frame(Math.min(n - 1, t * (RATE / 2)));
    const ox = (t % cols) * (w + 4) + 2;
    const oy = Math.floor(t / cols) * (h + BAR + 6) + 34;
    for (let y = 0; y < h; y++) src.copy(sheet, ((oy + y) * SW + ox) * 3, y * w * 3, (y + 1) * w * 3);
    const bw = Math.min(w, Math.round((half[t] / 24) * w));
    for (let y = oy + h + 2; y < oy + h + 2 + BAR; y++)
      for (let x = ox; x < ox + bw; x++) {
        const k = (y * SW + x) * 3;
        sheet[k] = 248; sheet[k + 1] = 44; sheet[k + 2] = 46;
      }
    drawText(sheet, SW, ox + 3, oy + 3, (t / 2).toFixed(1), 2);
  }
  writeFileSync(path.join(OUT_DIR, `sheet-${String(index).padStart(2, "0")}-${name}.png`), encodePng(SW, SH, sheet));

  return {
    index, name, ...meta,
    peak: Math.max(...half),
    mean: half.reduce((p, v) => p + v, 0) / half.length,
    half: half.map((v) => +v.toFixed(1)),
  };
};

mkdirSync(OUT_DIR, { recursive: true });
const files = readdirSync(SRC_DIR).filter((f) => f.endsWith(".mp4")).sort();
const results = new Array(files.length);
let next = 0;
const worker = async () => {
  while (next < files.length) {
    const i = next++;
    const t0 = Date.now();
    results[i] = await analyze(path.join(SRC_DIR, files[i]), i);
    console.log(`#${i} ${files[i]}  ${((Date.now() - t0) / 1000).toFixed(1)}s  peak ${results[i].peak.toFixed(1)}`);
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
writeFileSync(path.join(OUT_DIR, "motion.json"), JSON.stringify(results, null, 1));
console.log("wrote", OUT_DIR);
