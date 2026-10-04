// Builds the edit-ready proxies for the Cake Canvas reel (src/CakeCanvas).
//
//   node scripts/make-reel5-proxies.mjs [--force]
//
// Photos: the iPhone JPEGs are stored landscape with EXIF orientation 6, so
// each is turned upright here and downscaled to 2400x3200 — still enough for
// the hook's tight push-ins on the cakes.
//
// Videos: each shot's span is conformed to constant 30fps bt709 H.264 with its
// playback speed baked in (the 60fps iPhone clips slow down cleanly that way).
// The two .MOV clips are stored sideways with a -90 display matrix; ffmpeg's
// own rotation is disabled and done after the downscale instead.
//
// A sidecar .json records what each proxy was built from; unchanged shots are
// skipped. One encode at a time, capped threads — this machine is unstable
// under sustained full-core load.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SHOTS, proxyFile, proxySize, proxySourceSec, proxyStartSec } from "../src/CakeCanvas/shots.ts";

const ROOT = process.cwd();
const BIN = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc");
const FFMPEG = path.join(BIN, "ffmpeg.exe");
const FFPROBE = path.join(BIN, "ffprobe.exe");
const SRC_DIR = path.join(ROOT, "public/Reel_5_Content");
const FORCE = process.argv.includes("--force");

/** EXIF orientation of the photos: all upright except these two. */
const UPRIGHT_PHOTOS = new Set(["IMG_7402.JPG", "IMG_7403.JPG"]);

const probe = (file) => {
  const j = JSON.parse(
    execFileSync(FFPROBE, [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=color_range,color_space:stream_side_data=rotation:format=duration",
      "-of", "json", file,
    ]).toString(),
  );
  const s = j.streams[0] ?? {};
  const rotation = s.side_data_list?.find((d) => "rotation" in d)?.rotation ?? 0;
  return { duration: Number(j.format.duration), rotation, matrix: s.color_space === "bt709" ? "bt709" : "bt601" };
};

const run = (args) =>
  new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args);
    let err = "";
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err}`))));
  });

mkdirSync(path.join(ROOT, "public/reel5"), { recursive: true });

const seen = new Set();
let built = 0;
for (const [i, shot] of SHOTS.entries()) {
  const out = path.join(ROOT, "public", proxyFile(i));
  if (seen.has(out)) continue;
  seen.add(out);
  const src = path.join(SRC_DIR, shot.src);
  const { w, h } = proxySize(shot);
  let stamp;
  let args;

  if (shot.kind === "photo") {
    const turn = UPRIGHT_PHOTOS.has(shot.src) ? "" : ",transpose=clock";
    const filter = `scale=${turn ? `${h}:${w}` : `${w}:${h}`}:flags=lanczos${turn},format=yuvj420p`;
    stamp = { src: shot.src, filter };
    args = ["-noautorotate", "-i", src, "-vf", filter, "-frames:v", "1", "-q:v", "2", "-y", out];
  } else {
    const { duration, rotation, matrix } = probe(src);
    const start = proxyStartSec(i);
    const len = proxySourceSec(i);
    if (start + len > duration + 0.02) {
      throw new Error(`shot ${i + 1}: needs ${shot.src} up to ${(start + len).toFixed(2)}s, clip is ${duration.toFixed(2)}s`);
    }
    const sideways = Math.abs(rotation) === 90;
    const turn = rotation === -90 ? ",transpose=clock" : rotation === 90 ? ",transpose=cclock" : "";
    const filter =
      `scale=${sideways ? `${h}:${w}` : `${w}:${h}`}:flags=lanczos:` +
      `in_color_matrix=${matrix}:out_color_matrix=bt709:out_range=tv${turn},format=yuv420p`;
    // The bundled ffmpeg has no setpts, so the slow-down happens at the
    // demuxer (-itsscale) and the span is cut on the output, in stretched time.
    const k = 1 / (shot.speed ?? 1);
    stamp = { src: shot.src, start: +start.toFixed(3), len: +len.toFixed(3), k: +k.toFixed(4), filter };
    args = [
      "-noautorotate", "-display_rotation", "0", "-threads", "4",
      "-itsscale", String(k), "-i", src,
      "-ss", (start * k).toFixed(3), "-t", (len * k).toFixed(3),
      "-map", "0:v:0", "-an", "-filter_threads", "1", "-vf", filter,
      "-r", "30", "-fps_mode", "cfr",
      "-c:v", "libx264", "-threads", "8", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
      // Short GOPs: the renderer seeks to a fresh time on every frame.
      "-g", "15", "-keyint_min", "15", "-sc_threshold", "0",
      "-movflags", "+faststart", "-y", out,
    ];
  }

  const sidecar = out.replace(/\.(mp4|jpg)$/, ".json");
  if (!FORCE && existsSync(out) && existsSync(sidecar) && readFileSync(sidecar, "utf8") === JSON.stringify(stamp)) {
    continue;
  }
  const t0 = Date.now();
  await run(["-hide_banner", "-loglevel", "error", ...args]);
  writeFileSync(sidecar, JSON.stringify(stamp));
  built++;
  console.log(`${String(i + 1).padStart(2)} ${shot.src}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
console.log(`proxies up to date in public/reel5/ (${seen.size} files, ${built} built)`);
