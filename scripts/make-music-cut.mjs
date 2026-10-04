// Cuts the reel's music bed out of the source track.
//
//   node scripts/make-music-cut.mjs
//
// The source runs at 118.75 BPM with its downbeat at 0.020s. The edit is built
// on a 120 BPM grid (15-frame beat, 60-frame bar at 30fps), so the cut is
// nudged by atempo=1.0105 — around one percent, well under the threshold where
// anyone hears it — and every bar line then falls exactly on a whole frame.
//
// The window starts three bars before the drop at 64.69s, which puts the drop
// on frame 180 of the composition: the 6s mark, where the reel's fast cuts
// begin.
//
// Output is WAV, not MP3: mp3 encoder delay would shift the whole bed by a
// couple of frames and undo the alignment this script exists to create.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FFMPEG = path.join(
  ROOT,
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
);

const SRC = path.join(
  ROOT,
  "public/Reel_2_Content/ikoliks_aj-indian-indian-music-294105.mp3",
);
const OUT_DIR = path.join(ROOT, "public/party");
const OUT = path.join(OUT_DIR, "music.wav");

const SOURCE_BPM = 118.75;
const TARGET_BPM = 120;
const TEMPO = TARGET_BPM / SOURCE_BPM; // 1.010526
const DROP_SEC = 64.6937; // bar 32 of the source grid
const REEL_SEC = 20;
const DROP_AT_REEL_SEC = 6;

/**
 * The autocorrelated downbeat estimate lands a little late: combing the cut
 * against a true 120 BPM grid puts the groove 95ms early, so the window opens
 * that much sooner and the beats fall on whole frames. Re-measure with
 * `node scripts/pick-music-cut.mjs public/party/music.wav` after any change.
 */
const PHASE_TRIM_SEC = 0.095 * TEMPO;

const startSec = DROP_SEC - DROP_AT_REEL_SEC * TEMPO - PHASE_TRIM_SEC;
const takeSec = REEL_SEC * TEMPO + 0.4; // a little handle past the end

mkdirSync(OUT_DIR, { recursive: true });

console.log(`source window   ${startSec.toFixed(4)}s .. ${(startSec + takeSec).toFixed(4)}s`);
console.log(`atempo          ${TEMPO.toFixed(6)}  (${SOURCE_BPM} -> ${TARGET_BPM} BPM)`);
console.log(`drop lands at   ${DROP_AT_REEL_SEC}s = frame ${DROP_AT_REEL_SEC * 30}`);

execFileSync(
  FFMPEG,
  [
    "-hide_banner", "-loglevel", "error",
    "-i", SRC,
    // Output-side seek: sample accurate, unlike an input seek into an mp3.
    "-ss", startSec.toFixed(6),
    "-t", takeSec.toFixed(6),
    "-af", `atempo=${TEMPO.toFixed(6)}`,
    "-ar", "44100", "-ac", "2",
    "-c:a", "pcm_s16le",
    "-y", OUT,
  ],
  { stdio: "inherit" },
);
console.log("wrote", path.relative(ROOT, OUT));
