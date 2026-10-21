# alphaTab integration

Package: `@coderline/alphatab` (validated with 1.8.4). Docs: https://alphatab.net/docs/

## Why alphaTab

It draws standard notation and guitar tab from one score, plays it with a built-in SoundFont
synth, and understands fingering, chord names and triplet feel. The lesson JSON is converted to
alphaTex, alphaTab's text format, so notation, tab and audio cannot disagree.

## Generating alphaTex

```js
import { lickToAlphaTex, transposeLick } from '.../scripts/lib/index.mjs';
const tex = lickToAlphaTex(transposeLick(lesson, 'Eb').lesson ?? lesson);
api.tex(tex); // AlphaTabApi instance
```

Output shape (one bar):

```
\title "…"
\tempo 120
.
\track "Guitar"
\staff {score tabs}
\ts 4 4 \tf triplet8th r.8 {ch "Cm7"} 5.4{lf 2}.8 8.4{lf 5}.8 … |
```

Mapping notes:

- `fret.string.duration`. String 1 is the high E, the same as the lesson format.
- Rests are written `r.8`, a tie is written `-.3.4` (a tie on string 3), and beat effects `{d}`, `{tu 3}` and `{ch "Cm7"}`.
- Left-hand finger `{lf N}` uses alphaTex numbering: 1 = thumb, 2 = index … 5 = little, so lesson
  finger + 1. `toAlphaTexFinger()` does this.
- Hammer-on and pull-off are both `{h}` on the starting note. A slide is `{sl}`.
- `\tf triplet8th` (swing) or `\tf none` (straight) is written on every bar.
- Inside alphaTab the parsed `note.string` counts from the low string (6 = high E). The round
  trip accounts for this. Do not "fix" the generator.

## Playback controls (AlphaTabApi)

- Play and pause: `api.playPause()`. Stop: `api.stop()`.
- Tempo: `api.playbackSpeed = bpm / lesson.tempo.default`.
- Loop: `api.isLooping = true`, with an optional `api.playbackRange`.
- Count-in: `api.countInVolume = 1`. Metronome: `api.metronomeVolume = 1`.
- SoundFont: set `player.soundFont` to the sonivox `.sf2` shipped in the package
  (`dist/soundfont/`), and set `player.enablePlayer = true`.
- Big touch targets for these controls are an app concern. alphaTab does not draw them.

## Fretboard diagram

alphaTab does not render a fretboard. Build a small SVG component that reads the lesson's
`string`/`fret`/`finger` (or a voicing's `notes`), with string 6 at the bottom as players see it.
Highlight the note under alphaTab's playback cursor with `api.playedBeatChanged`.

## If alphaTab changes

If a new alphaTab version parses differently, `validate.mjs --require-alphatab` fails with a
precise message such as "finger differs" or "swing setting differs". Fix `alphatex.mjs` and re-run
`selftest.mjs`.
