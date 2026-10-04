import "./index.css";
import { Composition, staticFile } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { Reel } from "./Reel/Reel";
import { REEL_FPS, REEL_HEIGHT, REEL_WIDTH } from "./Reel/theme";
import { REEL_COPY, REEL_DURATION_IN_FRAMES } from "./Reel/reel-data";
import {
  VIBE_COPY,
  VIBE_DURATION,
  VIBE_FPS,
  VIBE_HEIGHT,
  VIBE_WIDTH,
  VibeHomeParty,
  vibePartySchema,
} from "./VibeParty";
import {
  BADMINTON_COPY,
  BADMINTON_DURATION,
  BADMINTON_FPS,
  BADMINTON_HEIGHT,
  BADMINTON_WIDTH,
  DuncitBadminton,
  badmintonSchema,
} from "./Badminton";
import {
  BEDAZZLE_COPY,
  BEDAZZLE_DURATION,
  BEDAZZLE_FPS,
  BEDAZZLE_HEIGHT,
  BEDAZZLE_WIDTH,
  DuncitBedazzle,
  bedazzleSchema,
} from "./Bedazzle";
import {
  CAKE_CANVAS_COPY,
  CAKE_CANVAS_DURATION,
  CAKE_CANVAS_FPS,
  CAKE_CANVAS_HEIGHT,
  CAKE_CANVAS_WIDTH,
  CakeCanvasReel,
  cakeCanvasSchema,
} from "./CakeCanvas";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        // node scripts/render-reel5.mjs  ->  out/duncit-cake-canvas.mp4
        id="CakeCanvasReel"
        component={CakeCanvasReel}
        durationInFrames={CAKE_CANVAS_DURATION}
        fps={CAKE_CANVAS_FPS}
        width={CAKE_CANVAS_WIDTH}
        height={CAKE_CANVAS_HEIGHT}
        schema={cakeCanvasSchema}
        defaultProps={CAKE_CANVAS_COPY}
      />

      <Composition
        // npx remotion render DuncitBedazzle out/duncit-bedazzle-the-japanese.mp4
        id="DuncitBedazzle"
        component={DuncitBedazzle}
        durationInFrames={BEDAZZLE_DURATION}
        fps={BEDAZZLE_FPS}
        width={BEDAZZLE_WIDTH}
        height={BEDAZZLE_HEIGHT}
        schema={bedazzleSchema}
        defaultProps={BEDAZZLE_COPY}
      />

      <Composition
        // npx remotion render DuncitBadminton out/duncit-badminton.mp4
        id="DuncitBadminton"
        component={DuncitBadminton}
        durationInFrames={BADMINTON_DURATION}
        fps={BADMINTON_FPS}
        width={BADMINTON_WIDTH}
        height={BADMINTON_HEIGHT}
        schema={badmintonSchema}
        defaultProps={BADMINTON_COPY}
      />

      <Composition
        // npx remotion render VibeHomeParty out/vibe-home-party.mp4
        id="VibeHomeParty"
        component={VibeHomeParty}
        durationInFrames={VIBE_DURATION}
        fps={VIBE_FPS}
        width={VIBE_WIDTH}
        height={VIBE_HEIGHT}
        schema={vibePartySchema}
        defaultProps={{ ...VIBE_COPY }}
      />

      {/* Mount any React component to make it show up in the sidebar and work on it individually! */}
    </>
  );
};
