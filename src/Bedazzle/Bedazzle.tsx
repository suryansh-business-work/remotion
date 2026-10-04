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
import { Atmosphere } from "./Atmosphere";
import { BrandClose, LOCKUP_AT } from "./BrandClose";
import { SHOTS, spanOf } from "./cuts";
import { loadBedazzleFonts } from "./fonts";
import { PAPER_FRAMES, PaperWipe } from "./PaperWipe";
import { ShotLayer } from "./Shot";
import {
  ACT,
  DURATION,
  FPS,
  MUSIC_FADE_IN_FRAMES,
  MUSIC_FADE_OUT_FRAMES,
  MUSIC_START_SEC,
  bt,
  palette,
} from "./theme";
import { BedazzleTitle, OpeningTitle, VenueLine, WordReveal } from "./Titles";

export const bedazzleSchema = z.object({
  venue: z.string(),
  place: z.string(),
  wordCreate: z.string(),
  wordExpress: z.string(),
  wordConnect: z.string(),
  wordMemories: z.string(),
  workshopTitle: z.string(),
  workshopKind: z.string(),
  date: z.string(),
  venueLead: z.string(),
  venuePunch: z.string(),
  address: z.string(),
  closing: z.string(),
});

export type BedazzleProps = z.infer<typeof bedazzleSchema>;

/** Where the closing frame starts (the venue mark reveal leads into it). */
const BRAND_FROM = 738;

/** The lockup defocuses the footage into bokeh behind it. */
const Footage: React.FC = () => {
  const frame = useCurrentFrame();
  const lockup = BRAND_FROM + LOCKUP_AT;
  const blur = interpolate(frame, [lockup - 2, lockup + 30], [0, 22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        filter: `contrast(1.04) saturate(1.04)${blur > 0.2 ? ` blur(${blur.toFixed(2)}px)` : ""}`,
        // Blur pulls transparent edges in; overscan hides them.
        transform: blur > 0.2 ? `scale(${(1 + blur * 0.004).toFixed(4)})` : undefined,
      }}
    >
      {SHOTS.map((shot, i) => {
        const [first, end] = spanOf(i);
        return (
          <Sequence
            key={`${shot.clip}-${shot.from}`}
            from={first}
            durationInFrames={end - first}
            name={`${String(i + 1).padStart(2, "0")} ${shot.clip} ${shot.in.kind}`}
          >
            <ShotLayer index={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const DuncitBedazzle: React.FC<BedazzleProps> = (props) => {
  loadBedazzleFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.ink }}>
      <Footage />

      {/* ---- paper wipes ------------------------------------------------------ */}
      {SHOTS.map((shot, i) =>
        shot.in.kind === "paper" ? (
          <Sequence
            key={`paper-${shot.from}`}
            from={shot.from - PAPER_FRAMES / 2}
            durationInFrames={PAPER_FRAMES}
            name="paper wipe"
          >
            <PaperWipe seed={11 + i * 5} />
          </Sequence>
        ) : null,
      )}

      <Atmosphere />

      {/* ---- type ------------------------------------------------------------- */}
      <Sequence from={4} durationInFrames={118} name="title: opening">
        <OpeningTitle venue={props.venue} place={props.place} duration={118} />
      </Sequence>
      <Sequence from={bt(14)} durationInFrames={88} name={`word: ${props.wordCreate}`}>
        <WordReveal word={props.wordCreate} duration={88} />
      </Sequence>
      <Sequence from={bt(22) + 3} durationInFrames={84} name={`word: ${props.wordExpress}`}>
        <WordReveal word={props.wordExpress} duration={84} />
      </Sequence>
      <Sequence from={bt(28)} durationInFrames={80} name={`word: ${props.wordConnect}`}>
        <WordReveal word={props.wordConnect} duration={80} />
      </Sequence>
      <Sequence from={bt(34) + 3} durationInFrames={54} name={`word: ${props.wordCreate} ${props.wordMemories}`}>
        <WordReveal word={props.wordCreate} sub={props.wordMemories} duration={54} />
      </Sequence>
      <Sequence from={bt(37) + 13} durationInFrames={bt(42) - bt(37) - 15} name="title: workshop">
        <BedazzleTitle
          title={props.workshopTitle}
          kind={props.workshopKind}
          date={props.date}
          duration={bt(42) - bt(37) - 15}
        />
      </Sequence>
      <Sequence from={ACT.venue + 4} durationInFrames={BRAND_FROM - ACT.venue - 4} name="title: venue">
        <VenueLine lead={props.venueLead} punch={props.venuePunch} duration={BRAND_FROM - ACT.venue - 4} />
      </Sequence>

      {/* ---- venue mark -> brand close ------------------------------------------ */}
      <Sequence from={BRAND_FROM} durationInFrames={DURATION - BRAND_FROM} name="brand close">
        <BrandClose
          address={props.address}
          workshop={`${props.workshopTitle} ${props.workshopKind}`}
          date={props.date}
          closing={props.closing}
        />
      </Sequence>

      {/* ---- music -------------------------------------------------------------- */}
      <Html5Audio
        src={staticFile("Reel_4_content/music.mp3")}
        trimBefore={Math.round(MUSIC_START_SEC * FPS)}
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
