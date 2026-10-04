import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  interpolate,
  staticFile,
} from "remotion";
import { z } from "zod";
import "./fonts";
import { Atmosphere } from "./Atmosphere";
import { SHOTS, proxySize } from "./cuts";
import { DuncitEnding } from "./DuncitEnding";
import { ImpactWord } from "./ImpactWord";
import { ShotLayer } from "./Shot";
import {
  ACT,
  BEAT,
  DURATION,
  FPS,
  MUSIC_FADE_IN_FRAMES,
  MUSIC_FADE_OUT_FRAMES,
  MUSIC_START_SEC,
  brand,
} from "./theme";

export const badmintonSchema = z.object({
  /** Impact words. Leave any of them empty to drop it. */
  wordIntensity: z.string(),
  wordIntensity2: z.string(),
  wordPeak: z.string(),
  endLine: z.string(),
  website: z.string(),
});

export type BadmintonProps = z.infer<typeof badmintonSchema>;

const dropShot = SHOTS.find((s) => s.from === ACT.peak)!;

/** Where each impact word sits: on the downbeats that open each act. */
const WORDS: { key: keyof BadmintonProps; from: number; d: number }[] = [
  { key: "wordIntensity", from: ACT.intensity, d: 42 },
  { key: "wordIntensity2", from: ACT.intensity + 120, d: 40 },
  // Lands on the contact frame of the slowed-down smash on the drop, and
  // clears as that shot cuts away.
  {
    key: "wordPeak",
    from: ACT.peak + dropShot.hits![0],
    d: dropShot.durationInFrames - dropShot.hits![0],
  },
];

export const DuncitBadminton: React.FC<BadmintonProps> = (props) => {
  return (
    <AbsoluteFill style={{ backgroundColor: brand.ink }}>
      {/* ---- footage ------------------------------------------------------ */}
      <AbsoluteFill style={{ filter: "contrast(1.08) saturate(1.14)" }}>
        {SHOTS.map((shot, i) => (
          <Sequence
            key={`${shot.clip}-${shot.from}`}
            from={shot.from}
            durationInFrames={shot.durationInFrames}
            name={`${String(i + 1).padStart(2, "0")} ${shot.clip} ${shot.in.kind}`}
          >
            <ShotLayer
              shot={shot}
              index={i}
              next={SHOTS[i + 1]?.in}
              frameSize={proxySize(shot)}
            />
          </Sequence>
        ))}
      </AbsoluteFill>

      <Atmosphere />

      {/* ---- type --------------------------------------------------------- */}
      {WORDS.map(({ key, from, d }) =>
        props[key] ? (
          <Sequence key={key} from={from} durationInFrames={d} name={`word: ${props[key]}`}>
            <ImpactWord text={props[key]} beatOffset={from % BEAT} />
          </Sequence>
        ) : null,
      )}

      {/* ---- brand close -------------------------------------------------- */}
      <Sequence from={ACT.ending} durationInFrames={DURATION - ACT.ending} name="duncit ending">
        <DuncitEnding line={props.endLine} website={props.website} />
      </Sequence>

      {/* ---- music -------------------------------------------------------- */}
      <Html5Audio
        src={staticFile("Reel_3_content/music.mp3")}
        trimBefore={MUSIC_START_SEC * FPS}
        // scripts/render-badminton.mjs rebuilds this same envelope in ffmpeg.
        volume={(f) =>
          interpolate(
            f,
            [0, MUSIC_FADE_IN_FRAMES, DURATION - MUSIC_FADE_OUT_FRAMES, DURATION - 1],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          )
        }
      />
    </AbsoluteFill>
  );
};
