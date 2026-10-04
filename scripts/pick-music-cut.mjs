// Picks the section of a track to cut a reel to.
//
//   node scripts/pick-music-cut.mjs <mp3> [reelSeconds] [dropAtSeconds]
//
// Reports a fine tempo estimate, the downbeat grid, a half-second energy map
// and the strongest drops — a drop being a bar line where the energy of the
// next four bars jumps hard over the previous four. The reel wants its drop at
// `dropAtSeconds`, so each candidate is reported with the start time that puts
// it there.
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const FFMPEG = path.join(
  ROOT,
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
);

const src = process.argv[2];
const reelSec = Number(process.argv[3] ?? 20);
const dropAt = Number(process.argv[4] ?? 6);

const SR = 8000;
const raw = execFileSync(
  FFMPEG,
  [
    "-hide_banner", "-loglevel", "error",
    "-i", src, "-ac", "1", "-ar", String(SR),
    "-f", "wav", "-c:a", "pcm_s16le", "-",
  ],
  { maxBuffer: 1 << 30 },
);
let off = 12;
while (off + 8 <= raw.length) {
  const id = raw.toString("ascii", off, off + 4);
  const size = raw.readUInt32LE(off + 4);
  if (id === "data") { off += 8; break; }
  off += 8 + size + (size % 2);
}
const pay = raw.subarray(off, off + (raw.length - off - ((raw.length - off) % 2)));
const samples = new Int16Array(pay.buffer.slice(pay.byteOffset, pay.byteOffset + pay.length));
const durationSec = samples.length / SR;

// 10ms energy + onset envelope.
const HOP = SR / 100;
const n = Math.floor(samples.length / HOP);
const rms = new Float64Array(n);
for (let i = 0; i < n; i++) {
  let s = 0;
  for (let j = 0; j < HOP; j++) { const v = samples[i * HOP + j] / 32768; s += v * v; }
  rms[i] = Math.sqrt(s / HOP);
}
const onset = new Float64Array(n);
for (let i = 1; i < n; i++) onset[i] = Math.max(0, rms[i] - rms[i - 1]);

// --- fine tempo: a comb over the whole track. Phase error accumulates over
// 100+ seconds, so this discriminates 125 from 126 easily. -----------------
const sampleEnv = (x) => {
  const i = Math.floor(x);
  if (i < 0 || i + 1 >= n) return 0;
  const f = x - i;
  return onset[i] * (1 - f) + onset[i + 1] * f;
};
let best = { bpm: 0, score: -1, phase: 0 };
for (let bpm = 110; bpm <= 140; bpm += 0.01) {
  const beat = 6000 / bpm; // 10ms frames per beat
  let bestPhaseScore = -1;
  let bestPhase = 0;
  for (let p = 0; p < beat; p += 0.5) {
    let s = 0;
    for (let b = 0; ; b++) {
      const x = p + b * beat;
      if (x >= n - 1) break;
      s += sampleEnv(x);
    }
    if (s > bestPhaseScore) { bestPhaseScore = s; bestPhase = p; }
  }
  if (bestPhaseScore > best.score) best = { bpm, score: bestPhaseScore, phase: bestPhase };
}
const beatF = 6000 / best.bpm;
const barF = beatF * 4;

// --- drops: bar lines where the next 4 bars jump over the previous 4 -------
const cum = new Float64Array(n + 1);
for (let i = 0; i < n; i++) cum[i + 1] = cum[i] + rms[i];
const meanOf = (a, b) => (cum[Math.min(n, Math.max(0, Math.round(b)))] - cum[Math.min(n, Math.max(0, Math.round(a)))]) / Math.max(1, Math.round(b) - Math.round(a));

const drops = [];
for (let bar = 1; ; bar++) {
  const at = best.phase + bar * barF;
  if (at + 4 * barF >= n) break;
  if (at - 4 * barF < 0) continue;
  const before = meanOf(at - 4 * barF, at);
  const after = meanOf(at, at + 4 * barF);
  const startSec = (at / 100) - dropAt;
  if (startSec < 0 || startSec + reelSec > durationSec) continue;
  drops.push({ atSec: at / 100, ratio: after / before, after, startSec });
}
drops.sort((a, b) => b.ratio - a.ratio);

console.log(`file           ${path.basename(src)}`);
console.log(`duration       ${durationSec.toFixed(2)}s`);
console.log(`tempo          ${best.bpm.toFixed(2)} BPM   beat ${(60 / best.bpm).toFixed(4)}s  bar ${(240 / best.bpm).toFixed(4)}s`);
console.log(`downbeat @     ${(best.phase / 100).toFixed(3)}s`);
console.log(`at 30fps       beat ${((60 / best.bpm) * 30).toFixed(3)}f   bar ${((240 / best.bpm) * 30).toFixed(3)}f`);
console.log(`atempo to 120  ${(120 / best.bpm).toFixed(6)}`);

console.log(`\nstrongest drops (reel start = drop - ${dropAt}s):`);
for (const d of drops.slice(0, 8)) {
  console.log(
    `  drop @ ${d.atSec.toFixed(2).padStart(7)}s   jump x${d.ratio.toFixed(2)}   level ${d.after.toFixed(3)}   -> cut from ${d.startSec.toFixed(2)}s`,
  );
}

console.log("\nenergy map, 1 char = 0.5s, rows of 20s:");
for (let t0 = 0; t0 < durationSec; t0 += 20) {
  let row = "";
  for (let t = t0; t < Math.min(durationSec, t0 + 20); t += 0.5) {
    const m = meanOf(t * 100, (t + 0.5) * 100);
    row += " .:-=+*#%"[Math.max(0, Math.min(8, Math.floor((m / 0.24) * 8)))];
  }
  console.log(`  ${String(t0).padStart(3)}s |${row}|`);
}
