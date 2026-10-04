// Cuts the reel window out of the source recording, frame-accurately.
//
//   node scripts/make-clip.mjs <startSec> <durationSec> [srcMp4]
//
// Writes public/reel-clip.mp4, which the Reel composition crops to 9:16.
// Keep the values in sync with SOURCE_WINDOW in src/Reel/reel-data.ts.
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const FFMPEG = path.join(
  ROOT,
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
);

const [startArg, durArg, srcArg] = process.argv.slice(2);
const start = Number(startArg);
const dur = Number(durArg);
const src = srcArg ?? path.join(ROOT, "public/video1111331589.mp4");

if (!Number.isFinite(start) || !Number.isFinite(dur)) {
  console.error("usage: node scripts/make-clip.mjs <startSec> <durationSec> [srcMp4]");
  process.exit(1);
}

const out = path.join(ROOT, "public/reel-clip.mp4");

console.log(`cutting ${start}s -> ${start + dur}s`);
execFileSync(
  FFMPEG,
  [
    "-hide_banner", "-loglevel", "error",
    "-ss", String(start),
    "-i", src,
    "-t", String(dur),
    "-c:v", "libx264", "-crf", "18", "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    "-y", out,
  ],
  { stdio: "inherit" },
);
console.log("wrote", out);
