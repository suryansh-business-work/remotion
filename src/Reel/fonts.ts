import { loadFont } from "@remotion/fonts";
import { staticFile, continueRender, delayRender } from "remotion";

const FACES = [
  { family: "Baloo 2", weight: "600", file: "fonts/Baloo2-SemiBold.ttf" },
  { family: "Baloo 2", weight: "700", file: "fonts/Baloo2-Bold.ttf" },
  { family: "Baloo 2", weight: "800", file: "fonts/Baloo2-ExtraBold.ttf" },
  { family: "Mukta", weight: "700", file: "fonts/Mukta-Bold.ttf" },
  { family: "Mukta", weight: "800", file: "fonts/Mukta-ExtraBold.ttf" },
  { family: "Poppins", weight: "600", file: "fonts/Poppins-SemiBold.ttf" },
  { family: "Poppins", weight: "700", file: "fonts/Poppins-Bold.ttf" },
];

// Devanagari shaping needs the real font present before the first frame is
// painted, so block the render until every face has resolved.
const handle = delayRender("Loading Devanagari fonts");

Promise.all(
  FACES.map(({ family, weight, file }) =>
    loadFont({
      family,
      weight,
      url: staticFile(file),
      format: "truetype",
    }),
  ),
)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error("Font loading failed", err);
    continueRender(handle);
  });
