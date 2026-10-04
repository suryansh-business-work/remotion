// Copy + timing for the duncit reel.
//
// Source window: the "5 skin types + how to identify yours" segment of the
// recording, cut with:
//   node scripts/make-clip.mjs 58 60
export const REEL_DURATION_IN_FRAMES = 1800; // 60s @ 30fps

/** Source window used for the cut, in seconds. Kept here for traceability. */
export const SOURCE_WINDOW = { startSec: 58, durationSec: 60 };

export const REEL_COPY = {
  kicker: "स्किनकेयर बेसिक्स",
  hookLines: ["स्किन के 5 टाइप", "आपकी कौन-सी है?"],
  endHeadline: "अपनी स्किन टाइप\nपहचानना सीखिए",
  endSub: "रोज़ाना स्किनकेयर टिप्स के लिए",
  website: "duncit.com",
  cta: "फ़ॉलो करें",
  speakerName: "Monika Johri",
};
