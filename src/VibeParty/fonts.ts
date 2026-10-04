import { loadFont } from "@remotion/fonts";
import { continueRender, delayRender, staticFile } from "remotion";

// Kinetic type is measured per character, so the real face has to be resolved
// before the first frame is laid out — fallback metrics would stagger the
// letters against the wrong widths.
const handle = delayRender("Loading display font");

Promise.all(
  [
    { family: "Poppins", weight: "600", file: "fonts/Poppins-SemiBold.ttf" },
    { family: "Poppins", weight: "700", file: "fonts/Poppins-Bold.ttf" },
  ].map(({ family, weight, file }) =>
    loadFont({ family, weight, url: staticFile(file), format: "truetype" }),
  ),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error("Font loading failed", err);
    continueRender(handle);
  });
