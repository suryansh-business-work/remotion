// Builds the edit-ready proxies for the "Vibe Home Party" reel.
//
//   node scripts/make-party-proxies.mjs
//
// The source clips in public/Reel_2_Content are 4K60 HEVC Main-10 in HLG
// (bt2020nc / arib-std-b67). Browsers and the Remotion compositor both choke
// on that, so every clip is tone-mapped to SDR bt709 H.264 first.
//
// Framing is deliberately NOT baked in: portrait clips keep their full 9:16
// frame and the landscape clip keeps a wide 10:9 window, so the composition
// can reframe, pan and punch in per shot without another encode.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FFMPEG = path.join(
  ROOT,
  "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe",
);
const SRC_DIR = path.join(ROOT, "public/Reel_2_Content");
const OUT_DIR = path.join(ROOT, "public/party");

// HLG (arib-std-b67) -> SDR bt709. `hable` keeps highlights from clipping on
// the tungsten lamps and the TV, which is where all the party glow lives.
const TONEMAP = [
  "zscale=t=linear:npl=100",
  "format=gbrpf32le",
  "zscale=p=bt709",
  "tonemap=tonemap=hable:desat=0",
  "zscale=t=bt709:m=bt709:r=tv",
  "format=yuv420p",
].join(",");

const CLIPS = [
  // Dark blurry open -> room reveal -> full group wide -> walk to camera.
  { id: "wide", src: "IMG_2187.MOV", filter: "scale=1216:2160:flags=lanczos" },
  // Walk-through, mic interviews, laughing, hands-up celebration.
  { id: "people", src: "IMG_2165.MOV", filter: "scale=1216:2160:flags=lanczos" },
  // TV close-up -> friends on the bed -> candid laugh.
  { id: "candid", src: "IMG_2152.MOV", filter: "scale=1216:2160:flags=lanczos" },
  // Floor circle, game night.
  { id: "game", src: "IMG_2170.MOV", filter: "scale=1216:2160:flags=lanczos" },
  // Landscape. Neon LED strip + TV + the dance/game peak. Cropped to a 10:9
  // window so the composition still has ~1000px of horizontal pan headroom.
  { id: "dance", src: "IMG_2135.MOV", filter: "crop=2400:2160:720:0,scale=1600:1440:flags=lanczos" },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const { id, src, filter } of CLIPS) {
  const out = path.join(OUT_DIR, `${id}.mp4`);
  console.log(`-> ${id}.mp4  (${src})`);
  execFileSync(
    FFMPEG,
    [
      "-hide_banner", "-loglevel", "error", "-stats",
      "-i", path.join(SRC_DIR, src),
      "-map", "0:v:0", "-map", "0:a:0",
      "-vf", `${TONEMAP},${filter}`,
      "-r", "60",
      "-c:v", "libx264", "-crf", "19", "-preset", "fast",
      "-pix_fmt", "yuv420p",
      // Quarter-second keyframes: the edit seeks constantly, and long GOPs
      // make every OffthreadVideo scrub crawl.
      "-g", "15", "-keyint_min", "15", "-sc_threshold", "0",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-movflags", "+faststart",
      "-y", out,
    ],
    { stdio: "inherit" },
  );
}
console.log("proxies written to public/party/");
