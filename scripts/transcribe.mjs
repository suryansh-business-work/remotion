// Transcribes a 16kHz mono WAV with whisper.cpp (large-v3-turbo, Hindi).
//
//   node scripts/transcribe.mjs <wav> <outPrefix> [--dtw] [--threads N]
//
// --dtw adds token-level timestamps (needed for word-by-word captions) at a
// large speed cost, so the survey pass over the full recording runs without it
// and only the final 60s clip is re-transcribed with it.
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";

const CACHE = process.env.WHISPER_CACHE ?? path.join(os.tmpdir(), "whisper-cache");
const EXE = path.join(CACHE, "whisper.cpp", "Release", "whisper-cli.exe");
const MODEL = path.join(CACHE, "ggml-large-v3-turbo.bin");

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const [wav, outPrefix] = argv.filter((a) => !a.startsWith("--"));
const withDtw = flags.includes("--dtw");
const threadFlag = flags.find((f) => f.startsWith("--threads="));
const threads = threadFlag ? Number(threadFlag.split("=")[1]) : 14;

if (!wav || !outPrefix) {
  console.error("usage: node scripts/transcribe.mjs <wav> <outPrefix> [--dtw]");
  process.exit(1);
}

const args = [
  "-f", wav,
  "-m", MODEL,
  "--output-file", outPrefix,
  "--output-json",
  "-ojf",
  "-l", "hi",
  "-t", String(threads),
  "-bs", "1", // greedy: no beam search
  "-bo", "1",
  "-nf", // no temperature fallback re-decodes
  "-mc", "0", // no cross-segment text context
  "-pp",
  ...(withDtw ? ["--dtw", "large.v3.turbo"] : []),
];

console.log("running:", EXE, args.join(" "));
const child = spawn(EXE, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
