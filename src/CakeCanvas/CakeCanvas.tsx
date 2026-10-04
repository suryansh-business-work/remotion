import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { Atmosphere } from "./Atmosphere";
import { loadCakeCanvasFonts } from "./fonts";
import { ShotLayer } from "./Shot";
import { SHOTS, spanOf } from "./shots";
import { ACT, DURATION, palette } from "./theme";
import { ArtistTitle, Closing, DetailsCard, EventTitle, HookWords, Phrase } from "./Titles";

export const cakeCanvasSchema = z.object({
  hookCake: z.string(),
  hookCanvas: z.string(),
  hookCreation: z.string(),
  title: z.string(),
  workshop: z.string(),
  phraseDetails: z.string(),
  phraseColour: z.string(),
  phraseCreate: z.string(),
  artist: z.string(),
  artistBrand: z.string(),
  venue: z.string(),
  city: z.string(),
  price: z.string(),
  tagline: z.string(),
  register: z.string(),
  cta: z.string(),
});

export type CakeCanvasProps = z.infer<typeof cakeCanvasSchema>;

/** The three experience shots, each with its phrase. */
const PHRASE_SHOTS = [4, 5, 6] as const;

export const CakeCanvasReel: React.FC<CakeCanvasProps> = (props) => {
  loadCakeCanvasFonts();
  const phrases = [props.phraseDetails, props.phraseColour, props.phraseCreate];

  return (
    <AbsoluteFill style={{ backgroundColor: palette.ivory }}>
      {/* ---- footage ------------------------------------------------------------ */}
      {SHOTS.map((shot, i) => {
        const [first, end] = spanOf(i);
        return (
          <Sequence key={`${shot.src}-${shot.from}`} from={first} durationInFrames={end - first} name={`${String(i + 1).padStart(2, "0")} ${shot.src}`}>
            <ShotLayer index={i} />
          </Sequence>
        );
      })}

      {/* ---- type ------------------------------------------------------------- */}
      <Sequence from={0} durationInFrames={ACT.title + 4} name="hook words">
        <HookWords
          lines={[props.hookCake, props.hookCanvas, props.hookCreation]}
          starts={[3, 33, 63]}
          duration={ACT.title + 4}
        />
      </Sequence>
      <Sequence from={ACT.title} durationInFrames={ACT.experience - ACT.title} name="title: Cake Canvas">
        <EventTitle title={props.title} workshop={props.workshop} duration={ACT.experience - ACT.title} />
      </Sequence>
      {PHRASE_SHOTS.map((s, k) => (
        <Sequence key={s} from={SHOTS[s].from + 4} durationInFrames={SHOTS[s].to - SHOTS[s].from - 4} name={`phrase: ${phrases[k]}`}>
          <Phrase index={k + 1} text={phrases[k]} duration={SHOTS[s].to - SHOTS[s].from - 4} />
        </Sequence>
      ))}
      <Sequence from={ACT.artist + 4} durationInFrames={ACT.details - ACT.artist - 4} name="title: artist">
        <ArtistTitle artist={props.artist} brand={props.artistBrand} duration={ACT.details - ACT.artist - 4} />
      </Sequence>
      <Sequence from={ACT.details + 6} durationInFrames={ACT.close - ACT.details - 6} name="details card">
        <DetailsCard venue={props.venue} city={props.city} price={props.price} duration={ACT.close - ACT.details - 6} />
      </Sequence>
      <Sequence from={ACT.close} durationInFrames={DURATION - ACT.close} name="closing CTA">
        <Closing tagline={props.tagline} register={props.register} cta={props.cta} />
      </Sequence>

      {/* Grade, window light, paper and grain over everything: the type is
          printed on the same paper as the footage. */}
      <Atmosphere />
    </AbsoluteFill>
  );
};
