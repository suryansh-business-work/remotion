// Builds one edit-ready proxy per shot of the Bedazzle Workshop reel.
//
//   node scripts/make-reel4-proxies.mjs [--force]
//
// The originals in public/Reel_4_content/videos are phone HEVC: 4K camera
// clips (full-range yuvj420p) and 1080p Snapchat clips (limited range), all
// tagged bt470bg and all variable frame rate — the Snapchat ones advertise
// 120fps but average ~29. Chrome can't be trusted with any of that, so each
// shot's span (plus a handle each side) is conformed to constant 30fps,
// bt709 limited-range H.264.
//
// A sidecar .json records what each proxy was built from; unchanged shots are
// skipped, so tweaking one shot in cuts.ts only re-encodes that shot.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  SHOTS,
  proxyEndSec,
  proxyFile,
  proxySize,
  proxyStartSec,
} from "../src/Bedazzle/cuts.ts";

const ROOT = process.cwd();
const BIN = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc");
const FFMPEG = path.join(BIN, "ffmpeg.exe");
const FFPROBE = path.join(BIN, "ffprobe.exe");
const SRC_DIR = path.join(ROOT, "public/Reel_4_content/videos");
const FORCE = process.argv.includes("--force");
// One encode at a time, with capped threads: the bundled ffmpeg segfaults on
// parallel 4K HEVC decodes, and a full-core x264 run starves the machine.
const WORKERS = 1;
const DECODE_THREADS = "4";
const ENCODE_THREADS = "8";

const probe = (file) => {
  const j = JSON.parse(
    execFileSync(FFPROBE, [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream_side_data=rotation:format=duration",
      "-of", "json", file,
    ]).toString(),
  );
  const rotation = j.streams[0]?.side_data_list?.find((d) => "rotation" in d)?.rotation ?? 0;
  return { duration: Number(j.format.duration), rotation };
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args);
    let err = "";
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err}`)),
    );
  });

/** Decodes a finished proxy end to end; resolves to ffmpeg's complaints, if any. */
const decodeErrors = (file) =>
  new Promise((resolve) => {
    const p = spawn(FFMPEG, [
      "-hide_banner", "-v", "error", "-i", file,
      "-vf", "scale=64:-2", "-c:v", "rawvideo", "-f", "null", "-",
    ]);
    let err = "";
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => resolve(code === 0 ? err.trim() : `exit ${code}\n${err}`));
  });

const jobs = SHOTS.map((shot, i) => {
  const src = path.join(SRC_DIR, `${shot.clip}.mp4`);
  const { duration, rotation } = probe(src);
  const start = proxyStartSec(i);
  const end = Math.min(duration, proxyEndSec(i));
  const { w, h } = proxySize(shot);
  // bt601 matrix -> bt709, whatever the input range -> limited range.
  // The phones store portrait video sideways with a display-matrix rotation.
  // ffmpeg's automatic rotation crashes on the 4K frames, so it is disabled
  // and done here instead — after the downscale, where it is cheap. The
  // input's display matrix is also zeroed, or it would be copied onto the
  // already-upright proxy and every player would rotate it a second time.
  // (A display matrix of -90 means "turn clockwise to view".)
  const sideways = Math.abs(rotation) === 90;
  let turn = "";
  if (rotation === -90) turn = ",transpose=clock";
  else if (rotation === 90) turn = ",transpose=cclock";
  const filter =
    `scale=${sideways ? `${h}:${w}` : `${w}:${h}`}:flags=lanczos:` +
    `in_color_matrix=bt601:out_color_matrix=bt709:out_range=tv${turn},format=yuv420p`;
  const out = path.join(ROOT, "public", proxyFile(i));
  const stamp = { src: shot.clip, start: +start.toFixed(3), end: +end.toFixed(3), filter };
  return { i, shot, src, out, stamp };
});

mkdirSync(path.join(ROOT, "public/reel4"), { recursive: true });

let next = 0;
let built = 0;
const worker = async () => {
  while (next < jobs.length) {
    const { i, shot, src, out, stamp } = jobs[next++];
    const sidecar = out.replace(/\.mp4$/, ".json");
    if (
      !FORCE &&
      existsSync(out) &&
      existsSync(sidecar) &&
      readFileSync(sidecar, "utf8") === JSON.stringify(stamp)
    ) {
      continue;
    }
    const t0 = Date.now();
    const encode = () =>
      run([
        "-hide_banner", "-loglevel", "error",
        "-noautorotate", "-display_rotation", "0", "-threads", DECODE_THREADS,
        // Input seek lands on the preceding keyframe and decodes forward, so
        // the proxy starts exactly at `start`.
        "-ss", stamp.start.toFixed(3),
        "-t", (stamp.end - stamp.start).toFixed(3),
        "-i", src,
        "-map", "0:v:0", "-an",
        "-filter_threads", "1",
        "-vf", stamp.filter,
        // Conform the variable-rate phone footage to a constant 30fps.
        "-r", "30", "-fps_mode", "cfr",
        "-c:v", "libx264", "-threads", ENCODE_THREADS, "-crf", "16", "-preset", "medium",
        "-pix_fmt", "yuv420p",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-color_range", "tv",
        // Short GOPs: the composition seeks to a fresh time on every frame.
        "-g", "15", "-keyint_min", "15", "-sc_threshold", "0",
        "-movflags", "+faststart",
        "-y", out,
      ]);
    let problems = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      problems = await encode().then(
        () => decodeErrors(out),
        (err) => err.message,
      );
      if (!problems) break;
      console.warn(`${String(i + 1).padStart(2)} attempt ${attempt} failed: ${problems.split("\n")[0]}`);
    }
    if (problems) throw new Error(`shot ${i + 1}: could not build a clean proxy\n${problems}`);
    writeFileSync(sidecar, JSON.stringify(stamp));
    built++;
    console.log(
      `${String(i + 1).padStart(2)} ${shot.clip}  ${stamp.start.toFixed(2)}-${stamp.end.toFixed(2)}s  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
  }
};
await Promise.all(Array.from({ length: WORKERS }, worker));
console.log(`proxies up to date in public/reel4/ (${jobs.length} shots, ${built} built)`);
