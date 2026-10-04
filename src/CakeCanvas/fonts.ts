import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

let started = false;

/**
 * Loads the reel's faces before the first frame is drawn.
 *
 * A called function rather than a side-effect import on purpose: package.json
 * declares `"sideEffects": ["*.css"]`, so the bundler drops a bare import.
 */
export const loadCakeCanvasFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender("Loading Cake Canvas fonts");
  Promise.all(
    [
      // Variable font: one file covers every weight.
      { family: "Playfair Display", weight: "400 900", style: "normal", file: "fonts/PlayfairDisplay.ttf" },
      { family: "Playfair Display", weight: "400 900", style: "italic", file: "fonts/PlayfairDisplay-Italic.ttf" },
      { family: "Poppins", weight: "400", style: "normal", file: "fonts/Poppins-Regular.ttf" },
      { family: "Poppins", weight: "500", style: "normal", file: "fonts/Poppins-Medium.ttf" },
      { family: "Poppins", weight: "600", style: "normal", file: "fonts/Poppins-SemiBold.ttf" },
    ].map(({ family, weight, style, file }) =>
      loadFont({ family, weight, style, url: staticFile(file), format: "truetype" }),
    ),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error("Font loading failed", err);
      continueRender(handle);
    });
};
