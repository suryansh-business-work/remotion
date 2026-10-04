// Renders the DuncitBedazzle reel robustly (same approach as
// scripts/render-badminton.mjs — see there for why).
//
//   node scripts/render-reel4.mjs [out/duncit-bedazzle-the-japanese.mp4]
//   node scripts/render-reel4.mjs --stills=0,60,140     just a few check frames
//   node scripts/render-reel4.mjs --encode-only          reuse the last stills
//
// This machine is unreliable under sustained CPU load, so Chrome draws frames
// in small, retried chunks at modest concurrency and the GPU does the encode:
//   1. bundle once against a slim public dir
//   2. render chunks as JPEG stills under a timeout; a chunk that crashes,
//      hangs, logs a decode problem or comes back short is rendered again
//   3. cut the music bed straight from the mp3
//   4. encode stills + music with h264_nvenc, twice, and only accept the
//      result if both encodes are bit-identical
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  DURATION as TOTAL,
  FPS,
  MUSIC_FADE_IN_FRAMES,
  MUSIC_FADE_OUT_FRAMES,
  MUSIC_START_SEC,
} from "../src/Bedazzle/theme.ts";

const ROOT = process.cwd();
const FFMPEG = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const REMOTION = path.join(ROOT, "node_modules/@remotion/cli/remotion-cli.js");
const COMP = "DuncitBedazzle";
const CHUNK = 100;
const CONCURRENCY = "3";
const CHUNK_TIMEOUT_MS = 300_000;
const MAX_ATTEMPTS = 6;
const args = process.argv.slice(2);
const ENCODE_ONLY = args.includes("--encode-only");
const STILLS = args
  .find((a) => a.startsWith("--stills="))
  ?.slice("--stills=".length)
  .split(",")
  .map(Number);
const OUT = path.resolve(
  args.find((a) => !a.startsWith("--")) ?? "out/duncit-bedazzle-the-japanese.mp4",
);

// No dot in this name: the CLI rejects image-sequence folders that look like
// they have a file extension.
const WORK = path.join(ROOT, "out/reel4-render");
const PUBLIC = path.join(WORK, "public");
const BUNDLE = path.join(WORK, "bundle");
const FRAMES = path.join(WORK, "frames");

/** Log lines that mean a frame may have been decoded wrongly. */
const DECODE_TROUBLE = /concealing|error while decoding|No frame found|Invalid data found|corrupt/i;

const run = (bin, argv, { timeoutMs = 0 } = {}) =>
  new Promise((resolve) => {
    const p = spawn(bin, argv, { cwd: ROOT });
    let log = "";
    let timedOut = false;
    p.stdout.on("data", (c) => (log += c));
    p.stderr.on("data", (c) => (log += c));
    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          // Take down Chrome, the compositor and ffmpeg with it.
          spawn("taskkill", ["/pid", String(p.pid), "/t", "/f"]);
        }, timeoutMs)
      : null;
    p.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code, log, timedOut });
    });
  });

const remotion = (argv, opts) => run(process.execPath, [REMOTION, ...argv], opts);
const sha1 = (file) => createHash("sha1").update(readFileSync(file)).digest("hex");
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const bundle = async () => {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });

  // Remotion copies the public dir into the bundle; the 4K originals in public/
  // would make that gigabytes. The reel only needs these.
  console.log("-> slim public dir");
  for (const rel of ["reel4", "fonts", "duncit-wordmark.png", "Reel_4_content/music.mp3"]) {
    cpSync(path.join(ROOT, "public", rel), path.join(PUBLIC, rel), { recursive: true });
  }

  console.log("-> bundle");
  const bundled = await remotion([
    "bundle",
    "src/index.ts",
    `--public-dir=${PUBLIC}`,
    `--out-dir=${BUNDLE}`,
  ]);
  if (bundled.code !== 0) fail(bundled.log);
};

const cacheFlags = [`--offthreadvideo-cache-size-in-bytes=${1.2e9}`, "--log=verbose"];

/** Renders composition frames [a, b] into FRAMES, retrying until clean. */
const renderRange = async (a, b) => {
  const dir = path.join(WORK, `chunk-${String(a).padStart(3, "0")}`);
  for (let attempt = 1; ; attempt++) {
    rmSync(dir, { recursive: true, force: true });
    const t0 = Date.now();
    const { code, log, timedOut } = await remotion(
      [
        "render",
        BUNDLE,
        COMP,
        dir,
        "--sequence",
        `--frames=${a}-${b}`,
        "--image-format=jpeg",
        "--jpeg-quality=100",
        `--concurrency=${CONCURRENCY}`,
        ...cacheFlags,
      ],
      { timeoutMs: CHUNK_TIMEOUT_MS },
    );
    const stills = existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".jpeg"))
      : [];
    const trouble = log.split("\n").filter((l) => DECODE_TROUBLE.test(l));
    let why = "";
    if (timedOut) why = `hung past ${CHUNK_TIMEOUT_MS / 1000}s`;
    else if (code !== 0) why = `exit ${code}`;
    else if (trouble.length) why = `decode warning: ${trouble[0].trim().slice(0, 120)}`;
    else if (stills.length !== b - a + 1) why = `${stills.length} of ${b - a + 1} frames`;

    if (!why) {
      // Stills are named with their absolute frame number; move them into one
      // flat, zero-padded sequence for the encoder.
      for (const { name } of stills) {
        const frame = Number(name.match(/(\d+)\.jpeg$/)[1]);
        renameSync(path.join(dir, name), path.join(FRAMES, `f${String(frame).padStart(4, "0")}.jpeg`));
      }
      rmSync(dir, { recursive: true, force: true });
      console.log(`-> frames ${a}-${b} ok (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
      return;
    }
    console.warn(`-> frames ${a}-${b} attempt ${attempt} rejected: ${why}`);
    writeFileSync(path.join(WORK, `chunk-${a}.attempt${attempt}.log`), log);
    if (attempt === MAX_ATTEMPTS) fail("giving up; see the attempt logs in out/reel4-render");
  }
};

if (STILLS) {
  await bundle();
  for (const f of STILLS) await renderRange(f, f);
  console.log(`stills in ${path.relative(ROOT, FRAMES)}`);
  process.exit(0);
}

if (ENCODE_ONLY) {
  const have = existsSync(FRAMES) ? readdirSync(FRAMES).filter((n) => n.endsWith(".jpeg")).length : 0;
  if (have !== TOTAL) fail(`--encode-only needs ${TOTAL} stills in ${FRAMES}, found ${have}`);
  console.log(`-> reusing ${have} stills`);
} else {
  await bundle();
  for (let a = 0; a < TOTAL; a += CHUNK) await renderRange(a, Math.min(TOTAL, a + CHUNK) - 1);
}

// Every still must decode.
const stillCheck = await run(FFMPEG, [
  "-hide_banner", "-v", "error",
  "-framerate", String(FPS),
  "-i", path.join(FRAMES, "f%04d.jpeg"),
  "-vf", "scale=64:-2", "-c:v", "rawvideo", "-f", "null", "-",
]);
if (stillCheck.code !== 0 || stillCheck.log.trim()) fail(`corrupt stills:\n${stillCheck.log}`);

// The music bed is cut straight from the mp3 with the composition's envelope.
console.log("-> music");
const audioFile = path.join(WORK, "audio.wav");
const dur = TOTAL / FPS;
const fadeIn = MUSIC_FADE_IN_FRAMES / FPS;
const fadeOut = MUSIC_FADE_OUT_FRAMES / FPS;
const audio = await run(FFMPEG, [
  "-hide_banner", "-loglevel", "error",
  "-i", path.join(ROOT, "public/Reel_4_content/music.mp3"),
  "-af",
  [
    // atrim decodes from the top, so the cut is sample-accurate.
    `atrim=start=${MUSIC_START_SEC}:duration=${dur}`,
    "asetpts=PTS-STARTPTS",
    `volume='if(lt(t,${fadeIn}),t/${fadeIn},if(gt(t,${dur - fadeOut}),max(0,(${dur}-t)/${fadeOut}),1))':eval=frame`,
  ].join(","),
  "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le",
  "-y", audioFile,
]);
if (audio.code !== 0) fail(audio.log);

console.log("-> encode (NVENC, twice)");
mkdirSync(path.dirname(OUT), { recursive: true });
const encode = (file) =>
  run(FFMPEG, [
    "-hide_banner", "-loglevel", "error",
    "-framerate", String(FPS),
    "-i", path.join(FRAMES, "f%04d.jpeg"),
    "-i", audioFile,
    "-map", "0:v:0", "-map", "1:a:0",
    // Chrome's JPEGs are full-range BT.601; deliver limited-range BT.709.
    "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p",
    "-c:v", "h264_nvenc", "-preset", "p7", "-tune", "hq",
    "-rc", "vbr", "-cq", "16", "-b:v", "0", "-maxrate", "40M", "-bufsize", "80M",
    "-profile:v", "high", "-g", "60",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
    "-t", String(TOTAL / FPS),
    "-movflags", "+faststart",
    "-y", file,
  ]);
const twin = path.join(WORK, "twin.mp4");
const first = await encode(OUT);
const second = await encode(twin);
if (first.code !== 0 || second.code !== 0) fail(first.log || second.log);
if (sha1(OUT) !== sha1(twin)) fail("the two NVENC encodes differ; rerun");
console.log(`wrote ${path.relative(ROOT, OUT)}`);
