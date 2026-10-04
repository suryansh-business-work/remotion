import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

// The impact words are laid out per character, so the real face must resolve
// before the first frame is measured.
const handle = delayRender("Loading Poppins");

Promise.all(
  [
    { weight: "600", file: "fonts/Poppins-SemiBold.ttf" },
    { weight: "700", file: "fonts/Poppins-Bold.ttf" },
  ].map(({ weight, file }) =>
    loadFont({ family: "Poppins", weight, url: staticFile(file), format: "truetype" }),
  ),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error("Font loading failed", err);
    continueRender(handle);
  });
