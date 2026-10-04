# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## The `Reel` composition

A 60s, 1080x1920 duncit-branded reel cut from a long-form talking-head
recording (`public/video1111331589.mp4`).

The source is a 9:16 phone capture pillarboxed inside a 1280x720 frame — the
portrait content is exactly 405px wide, centred at x=437.5 — so `Reel.tsx`
crops to it in CSS rather than re-encoding. Note the explicit
`maxWidth: "none"` on the video: Tailwind's preflight `img { max-width: 100% }`
would otherwise clamp the deliberately oversized element and push it offscreen.

Structure:

- **0.0–3.5s** — the duncit plate opens full-bleed, contracts to a hero lockup
  above the speaker's head, then docks into the top-left channel slot. The
  Hindi hook rises in the lower third and lifts away.
- **3.5–55s** — clean video with the corner watermark and a brand progress bar.
- **55–60s** — a full-screen brand end slide: wordmark, takeaway line and
  `duncit.com`.

### Rebuilding the assets

```console
# 1. cache whisper.cpp + the large-v3-turbo model (~1.6GB, one time)
node scripts/setup-whisper.mjs <cacheDir>

# 2. transcribe, to choose the window (WHISPER_CACHE=<cacheDir>)
node scripts/transcribe.mjs <audio.wav> <outPrefix> [--dtw]

# 3. cut the chosen window
node scripts/make-clip.mjs 58 60

# 4. lift the white wordmark off its red plate
node scripts/make-wordmark.mjs public/duncit-logo.png public/duncit-wordmark.png
```

### Rendering

```console
npx remotion render src/index.ts Reel out/duncit-reel.mp4 --codec=h264 --crf=18 --jpeg-quality=100
```

## The `VibeHomeParty` composition

A 20s, 1080x1920 "Vibe Home Party" reel cut from the five phone clips in
`public/Reel_2_Content/`. Source: `src/VibeParty/`.

The whole reel sits on a **120 BPM grid** — 15-frame beat, 60-frame bar at
30fps. Every cut in `clips.ts`, every light hit in `FLASHES`, and the music
bed all share it, which is what makes the edit feel scored.

- **0–3s** — black, the lamps stutter on, push-in. `TONIGHT…`
- **3–6s** — friends, laughter, the mic. `GOOD PEOPLE`
- **6–10s** — the drop: six cuts, each shorter than the last.
- **10–14s** — a 1.7x→0.35x speed ramp, slow-mo against fast cuts. `GOOD VIBES`
- **14–18s** — one unbroken pull-back to the whole room. `VIBE HOME PARTY`
- **18–20s** — final hit, the title locks with a flare. `MAKE MEMORIES. FEEL THE VIBE.`

Shots are muted; room tone from two clips runs underneath the music so the
laughter still reads as real.

### Rebuilding the assets

The originals are 4K60 HEVC Main-10 **HLG** — neither Chrome nor the Remotion
compositor decodes that, so everything goes through SDR proxies first.

```console
# 1. tone-map + downscale the five clips to public/party/*.mp4
node scripts/make-party-proxies.mjs

# 2. (optional) find the tempo and the strongest drop in a new track
node scripts/pick-music-cut.mjs public/Reel_2_Content/<track>.mp3 20 6

# 3. cut the music bed: 118.75 -> 120 BPM, drop on frame 180
node scripts/make-music-cut.mjs
```

The proxies keep their full frame (portrait 9:16, landscape 10:9) so each shot
can reframe, pan and punch in from `clips.ts` without another encode.

### Rendering

```console
npx remotion render VibeHomeParty out/vibe-home-party.mp4 --crf=17
```

`public/` is ~730MB with the originals in it and Remotion copies it on every
render. For fast iteration point at a slimmer copy that holds only `party/`,
`fonts/` and the wordmark: `--public-dir=<dir>`.

## The `DuncitBadminton` composition

A 30s, 1080x1920 duncit badminton reel cut from the 53 phone clips in
`public/Reel_3_content/videos/`, scored to `public/Reel_3_content/music.mp3`.
Source: `src/Badminton/`.

The track is a clean **120 BPM** — 15-frame beat, 60-frame bar at 30fps. The
bed starts on the bar line at 32.23s, which puts the bass drop on frame 600.

- **0–3s HOOK** — jump smash slammed in and ramped 1x→0.4x→1.8x, a mid-air
  smash, then the net-post camera's own whip between players.
- **3–10s BUILD** — a cut every 1–2 beats: zoom-through, whip up, spin, glitch,
  whip left, strobe, defocus.
- **10–20s INTENSITY** — cuts on every beat, speed-ramped smash, overhead→overhead
  match cut, then half-beat strobes into the drop. `FASTER` / `FEARLESS`
- **20–27s PEAK** — on the drop: the biggest jump smash at 0.33x with letterbox,
  the shuttle hits the floor, snap back to real time; running jump smash, the
  highest leap at 0.35x, rackets up. `SMASH`
- **27–30s ENDING** — a diagonal duncit-red slash wipes the frame, the wordmark
  slams in with a shockwave and light sweep, `SEE YOU ON COURT` + `duncit.com`.

`src/Badminton/cuts.ts` is the whole edit: per shot the source moment, speed
curve, crop, subject focus, zoom, transition in, impact frames. Speed ramps are
smooth rather than stepped — each frame freezes the video at the integral of the
rate curve (a fractional `<Freeze>`), and the proxies keep 60fps so slow motion
has real in-between frames. Transitions never overlap two decodes: the outgoing
shot plays the mirror image of the next shot's entrance over its last frames.

### Rebuilding the assets

The originals are 4K60 HEVC Main-10 **HDR10 (PQ)**; everything goes through SDR
proxies first.

```console
# 1. (optional) scout: contact sheet + motion curve per clip
node scripts/analyze-reel3.mjs <outDir>

# 2. tone-map + encode just the span each shot in cuts.ts uses
node scripts/make-badminton-proxies.mjs
```

Proxies are H.264 with **no B-frames** (speed ramps seek backwards; with
B-frames the compositor concealed whole frames) and are encoded on the GPU
(NVDEC + NVENC). Each one is encoded twice and accepted only if both copies are
bit-identical and decode cleanly.

### Rendering

```console
node scripts/render-badminton.mjs out/duncit-badminton.mp4
# re-encode only, reusing the stills from the last render:
node scripts/render-badminton.mjs --encode-only out/duncit-badminton.mp4
```

Chrome renders 150-frame chunks as JPEG stills under a timeout. Any chunk that
crashes, hangs, logs a decode warning or comes back short is rendered again. The
music is cut from the mp3 with the composition's fade envelope, and stills +
music are encoded with NVENC twice, then checked to be bit-identical.

Why not plain `npx remotion render DuncitBadminton`: on this machine, CPU-heavy
work failed intermittently. x264 encodes crashed, hung, or silently wrote corrupt
streams, and long renders died with access violations. Windows has also logged
WHEA "corrected hardware error" events. The same work on the GPU was
deterministic. If the CPU gets fixed, a plain render will work too.

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
