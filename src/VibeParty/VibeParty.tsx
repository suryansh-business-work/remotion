import React from "react";
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { z } from "zod";
import "./fonts";
import { Atmosphere, flashAt } from "./Atmosphere";
import { SHOTS } from "./clips";
import { ShotLayer } from "./Shot";
import {
  GoodPeopleTitle,
  GoodVibesTitle,
  HeroTitle,
  TonightTitle,
} from "./Titles";
import { ACT, DURATION, palette } from "./theme";

export const vibePartySchema = z.object({
  tonight: z.string(),
  peopleLine1: z.string(),
  peopleLine2: z.string(),
  vibesLine1: z.string(),
  vibesLine2: z.string(),
  hero: z.string(),
  heroSub: z.string(),
  tagline: z.string(),
  /**
   * Optional music bed, relative to public/ — e.g. "party/music.mp3". The reel
   * is cut to a 120 BPM grid, so a 120 BPM track lands on every cut as-is.
   * Leave null to ship with room tone only.
   */
  music: z.string().nullable(),
});

export type VibePartyProps = z.infer<typeof vibePartySchema>;

/**
 * The lights coming up. Two stutters and a dip before the room settles, which
 * is how a real switched-on room behaves — a clean fade reads as a dissolve.
 */
const lightsOn = (frame: number) =>
  interpolate(
    frame,
    [0, 11, 13, 16, 19, 22, 27, 36],
    [0.05, 0.06, 0.72, 0.11, 0.9, 0.34, 1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

export const VibeHomeParty: React.FC<VibePartyProps> = ({
  tonight,
  peopleLine1,
  peopleLine2,
  vibesLine1,
  vibesLine2,
  hero,
  heroSub,
  tagline,
  music,
}) => {
  const frame = useCurrentFrame();
  const { total } = flashAt(frame);
  const exposure = lightsOn(frame);

  // Room tone runs continuously underneath the cuts: the shots themselves are
  // muted, because a hard cut every half second turns real audio into noise.
  // With a music bed present the room tone ducks to a whisper — enough that the
  // laughter still reads as real, not enough to fight the track.
  const roomLevel = music ? 0.16 : 0.5;
  const ambienceA = (f: number) =>
    interpolate(f, [0, 18, 258, 288], [0, roomLevel, roomLevel, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const ambienceB = (f: number) =>
    interpolate(f, [0, 20, 280, 330], [0, roomLevel * 0.9, roomLevel * 0.9, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.ink }}>
      {/* ---- footage ------------------------------------------------------ */}
      <AbsoluteFill
        style={{
          filter: `brightness(${(exposure * 0.94 * (1 + total * 0.22)).toFixed(
            3,
          )}) contrast(${(1.14 + total * 0.1).toFixed(3)}) saturate(1.16)`,
        }}
      >
        {SHOTS.map((shot, i) => (
          <Sequence
            key={`${shot.clip}-${shot.from}`}
            from={shot.from}
            durationInFrames={shot.durationInFrames}
            name={`${String(i + 1).padStart(2, "0")} ${shot.clip}`}
          >
            <ShotLayer shot={shot} index={i} />
          </Sequence>
        ))}
      </AbsoluteFill>

      {/* ---- grade, light, grain ------------------------------------------ */}
      <Atmosphere />

      {/* ---- kinetic type -------------------------------------------------- */}
      <Sequence from={12} durationInFrames={76} name="TONIGHT">
        <TonightTitle text={tonight} />
      </Sequence>

      <Sequence from={ACT.people + 6} durationInFrames={80} name="GOOD PEOPLE">
        <GoodPeopleTitle lines={[peopleLine1, peopleLine2]} />
      </Sequence>

      <Sequence from={ACT.peak + 4} durationInFrames={112} name="GOOD VIBES">
        <GoodVibesTitle lines={[vibesLine1, vibesLine2]} />
      </Sequence>

      <Sequence
        from={ACT.pullback + 12}
        durationInFrames={DURATION - (ACT.pullback + 12)}
        name="VIBE HOME PARTY"
      >
        <HeroTitle
          hero={hero}
          sub={heroSub}
          tagline={tagline}
          lockAt={ACT.lock - (ACT.pullback + 12)}
        />
      </Sequence>

      {/* ---- sound --------------------------------------------------------- */}
      <Sequence from={0} durationInFrames={288} name="room tone">
        <Html5Audio src={staticFile("party/wide.mp4")} volume={ambienceA} />
      </Sequence>
      <Sequence from={270} durationInFrames={330} name="room tone">
        <Html5Audio src={staticFile("party/people.mp4")} volume={ambienceB} />
      </Sequence>
      {music ? (
        <Html5Audio
          src={staticFile(music)}
          volume={(f) =>
            // Quiet through the dark open, full from the drop, out on the lock.
            interpolate(
              f,
              [0, 30, 176, 180, DURATION - 24, DURATION - 2],
              [0.5, 0.62, 0.7, 1, 1, 0],
              {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
      {/* Shots are muted on purpose; see ambienceA above. */}
    </AbsoluteFill>
  );
};
