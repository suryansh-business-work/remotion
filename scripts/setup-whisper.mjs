// Downloads whisper.cpp (Windows prebuilt) + the large-v3-turbo model into a
// cache folder. Run: node scripts/setup-whisper.mjs <cacheDir>
import {
  installWhisperCpp,
  downloadWhisperModel,
} from "@remotion/install-whisper-cpp";
import path from "node:path";

export const WHISPER_VERSION = "1.7.4";
export const WHISPER_MODEL = "large-v3-turbo";

const cacheDir = process.argv[2] ?? path.join(process.cwd(), ".whisper");
const to = path.join(cacheDir, "whisper.cpp");

const a = await installWhisperCpp({
  version: WHISPER_VERSION,
  to,
  printOutput: true,
});
console.log("whisper.cpp ready (alreadyExisted:", a.alreadyExisted, ")");

const b = await downloadWhisperModel({
  model: WHISPER_MODEL,
  folder: to,
  printOutput: true,
});
console.log("model ready (alreadyExisted:", b.alreadyExisted, ")");
