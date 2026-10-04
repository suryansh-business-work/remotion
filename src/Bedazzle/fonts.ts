import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

let started = false;

/**
 * Loads the reel's faces. Titles are measured and stroked as SVG text, so the
 * real faces must resolve before the first frame is drawn.
 *
 * This is a called function rather than a side-effect import on purpose:
 * package.json declares `"sideEffects": ["*.css"]`, so the bundler silently
 * drops a bare `import "./fonts"`.
 */
export const loadBedazzleFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender("Loading Bedazzle reel fonts");
  Promise.all(
    [
      { family: "Poppins", weight: "600", style: "normal", file: "fonts/Poppins-SemiBold.ttf" },
      { family: "Poppins", weight: "700", style: "normal", file: "fonts/Poppins-Bold.ttf" },
      { family: "Instrument Serif", weight: "400", style: "normal", file: "fonts/InstrumentSerif-Regular.ttf" },
      { family: "Instrument Serif", weight: "400", style: "italic", file: "fonts/InstrumentSerif-Italic.ttf" },
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
