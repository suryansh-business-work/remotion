// Builds one edit-ready proxy per shot of the badminton reel.
//
//   node scripts/make-badminton-proxies.mjs [--force]
//
// The originals in public/Reel_3_content/videos are 4K60 HEVC Main-10 HDR10
// (smpte2084). Neither Chrome nor the Remotion compositor decodes that, so each
// shot's span (plus a quarter-second handle each side) is tone-mapped to SDR
// bt709 H.264. Frame rate stays at 60 so the slow-motion shots have real
// in-between frames to show.
//
// Portrait clips are kept whole at 1440x2560 so the composition can push in
// and reframe. Landscape clips are cropped to the window in the shot's `crop`
// and scaled to a 1920px height.
//
// A sidecar .json records what each proxy was built from; unchanged shots are
// skipped, so tweaking one shot in cuts.ts only re-encodes that shot.
//
// Reliability: on this machine, CPU-heavy x264 encodes intermittently came out
// corrupt (or ffmpeg crashed), even one at a time. Decoding and encoding on the
// GPU (NVDEC + NVENC) proved deterministic, so every proxy is encoded twice and
// only accepted when both copies are bit-identical and decode cleanly. That
// catches silent pixel damage too, not just broken bitstreams.
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  HANDLE_SEC,
  SHOTS,
  proxyFile,
  proxyStartSec,
  sourceSecAt,
} from "../src/Badminton/cuts.ts";

const ROOT = process.cwd();
const BIN = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc");
const FFMPEG = path.join(BIN, "ffmpeg.exe");
const FFPROBE = path.join(BIN, "ffprobe.exe");
const SRC_DIR = path.join(ROOT, "public/Reel_3_content/videos");
const FORCE = process.argv.includes("--force");
const MAX_ATTEMPTS = 4;

// PQ -> linear -> bt709 primaries -> hable -> bt709 transfer. `hable` rolls the
// LED strip lights and the white roof off gently instead of clipping them.
const TONEMAP = [
  "zscale=t=linear:npl=100",
  "format=gbrpf32le",
  "zscale=p=bt709",
  "tonemap=tonemap=hable:desat=0",
  "zscale=t=bt709:m=bt709:r=tv",
  "format=yuv420p",
].join(",");

const ENCODER = [
  "-c:v", "h264_nvenc", "-preset", "p7", "-tune", "hq",
  "-rc", "vbr", "-cq", "17", "-b:v", "0", "-profile:v", "high", "-pix_fmt", "yuv420p",
  // Short GOPs and no B-frames: a speed ramp seeks to a fresh fractional time
  // on every frame, sometimes backwards. With a B-pyramid the compositor's
  // reused decoders conceal whole frames after those jumps ("concealing 14288
  // DC, AC, MV errors"); P-only keeps decode order equal to display order.
  "-g", "12", "-bf", "0",
];

const probe = (file) => {
  const j = JSON.parse(
    execFileSync(FFPROBE, [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration",
      "-of", "json", file,
    ]).toString(),
  );
  const s = j.streams[0];
  const rot = Math.abs(s.side_data_list?.find((d) => "rotation" in d)?.rotation ?? 0);
  const sideways = rot === 90 || rot === 270;
  return {
    w: sideways ? s.height : s.width,
    h: sideways ? s.width : s.height,
    duration: Number(j.format.duration),
  };
};

const even = (v) => Math.round(v / 2) * 2;

/** Runs ffmpeg; resolves to "" on success or to its error output. */
const ffmpeg = (args) =>
  new Promise((resolve) => {
    const p = spawn(FFMPEG, args);
    let err = "";
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => resolve(code === 0 ? err.trim() : `ffmpeg exited ${code}\n${err}`));
  });

/** Decodes a finished proxy end to end; resolves to ffmpeg's complaints, if any. */
const decodeErrors = (file) =>
  // This ffmpeg build has no wrapped_avframe encoder, so the null muxer needs
  // an explicit (cheap) codec.
  ffmpeg(["-hide_banner", "-v", "error", "-i", file, "-vf", "scale=64:-2", "-c:v", "rawvideo", "-f", "null", "-"]);

const sha1 = (file) => createHash("sha1").update(readFileSync(file)).digest("hex");

const jobs = SHOTS.map((shot, i) => {
  const src = path.join(SRC_DIR, `${shot.clip}.mp4`);
  const meta = probe(src);
  const portrait = meta.h > meta.w;
  if (portrait === Boolean(shot.crop)) {
    throw new Error(
      `shot ${i + 1} (${shot.clip}): ${portrait ? "portrait clips take no crop" : "landscape clips need a crop"}`,
    );
  }
  const start = proxyStartSec(shot);
  const end = Math.min(meta.duration, sourceSecAt(shot, shot.durationInFrames) + HANDLE_SEC);

  let filter;
  if (portrait) {
    filter = "scale=1440:2560:flags=lanczos";
  } else {
    const cw = even(meta.w * shot.crop.w);
    const cx = Math.round(
      Math.min(meta.w - cw, Math.max(0, meta.w * shot.crop.x - cw / 2)),
    );
    filter = `crop=${cw}:${meta.h}:${cx}:0,scale=${even((cw * 1920) / meta.h)}:1920:flags=lanczos`;
  }

  const out = path.join(ROOT, "public", proxyFile(i, shot));
  const stamp = {
    src: shot.clip,
    start: +start.toFixed(3),
    end: +end.toFixed(3),
    filter,
    encoder: ENCODER.join(" "),
  };
  return { i, shot, src, out, stamp };
});

mkdirSync(path.join(ROOT, "public/badminton"), { recursive: true });

for (const { i, shot, src, out, stamp } of jobs) {
  const label = String(i + 1).padStart(2);
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
  const encode = (file) =>
    ffmpeg([
      "-hide_banner", "-loglevel", "warning",
      "-hwaccel", "cuda",
      // Input seek: lands on the preceding keyframe, then decodes forward to
      // the exact time, so the proxy starts precisely at `start`.
      "-ss", stamp.start.toFixed(3),
      "-t", (stamp.end - stamp.start).toFixed(3),
      "-i", src,
      "-map", "0:v:0", "-an",
      "-vf", `${stamp.filter},${TONEMAP}`,
      ...ENCODER,
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-movflags", "+faststart",
      "-y", file,
    ]);

  // One run at a time, twice per attempt, never in parallel.
  const twin = `${out}.twin.mp4`;
  let problem = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    problem =
      ((await encode(out)) && "first encode failed") ||
      ((await encode(twin)) && "second encode failed") ||
      (sha1(out) !== sha1(twin) && "the two encodes differ") ||
      (await decodeErrors(out));
    if (!problem) break;
    console.warn(`${label} attempt ${attempt} rejected: ${problem.split("\n")[0]}`);
  }
  rmSync(twin, { force: true });
  if (problem) {
    rmSync(out, { force: true });
    throw new Error(`shot ${i + 1}: could not build a clean proxy\n${problem}`);
  }
  writeFileSync(`${sidecar}.tmp`, JSON.stringify(stamp));
  renameSync(`${sidecar}.tmp`, sidecar);
  console.log(
    `${label} ${shot.clip}  ${stamp.start.toFixed(2)}-${stamp.end.toFixed(2)}s  ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}
console.log(`proxies up to date in public/badminton/ (${jobs.length} shots)`);
