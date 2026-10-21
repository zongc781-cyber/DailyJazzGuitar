# alphaTab integration

Package: `@coderline/alphatab` (validated with 1.8.4). Docs: https://alphatab.net/docs/

## Why alphaTab

It draws standard notation and guitar tab from one score, plays it with a built-in SoundFont
synth, and understands fingering, chord names and triplet feel. The lesson JSON is converted to
alphaTex, alphaTab's text format, so notation, tab and audio cannot disagree.

## Generating alphaTex

```js
// In the browser, import the modules directly: index.mjs also loads the Node-only round trip.
import { lickToAlphaTex } from '@/lib/music/alphatex.mjs';
import { transposeLick } from '@/lib/music/transpose.mjs';
const tex = lickToAlphaTex(transposeLick(lesson, 'Eb').lesson ?? lesson, { labels: 'degrees' });
api.tex(tex); // AlphaTabApi instance
```

Output shape (one bar):

```
\title "…"
\tempo 132
.
\track "Guitar"
\staff {score tabs}
\tuning E4 B3 G3 D3 A2 E2
\instrument electricguitarjazz
\ts 4 4 \ks gminor \tf triplet8th r.8 {ch "Gm6"} 7.3{lf 2 acc forcenatural}.8 {txt "5"} 9.3{lf 4 acc forcenatural}.8 {txt "6"} … |
```

Mapping notes:

- `fret.string.duration`. String 1 is the high E, the same as the lesson format.
- Rests are written `r.8`, a tie is written `-.3.4` (a tie on string 3), and beat effects `{d}`, `{tu 3}` and `{ch "Cm7"}`.
- Left-hand finger `{lf N}` uses alphaTex numbering: 1 = thumb, 2 = index … 5 = little, so lesson
  finger + 1. `toAlphaTexFinger()` does this.
- Hammer-on and pull-off are both `{h}` on the starting note. A slide is `{sl}`.
- `\tf triplet8th` (swing) or `\tf none` (straight) is written on every bar.
- `\ks` is the key signature from the lesson's key, and every note carries an explicit accidental
  (`acc forcesharp`, `forceflat`, `forcenatural` …) so alphaTab spells it exactly as `pitch` does.
- With `labels: 'degrees'` (the analysis overlay) each note's degree is written above it as beat
  text (`{txt "♭3"}`). The round trip checks the plain score and the overlay.
- Inside alphaTab the parsed `note.string` counts from the low string (6 = high E). The round
  trip accounts for this. Do not "fix" the generator.

## Playback controls (AlphaTabApi)

- Play and pause: `api.playPause()`. Stop: `api.stop()`.
- Tempo: `api.playbackSpeed = bpm / lesson.tempo.default`.
- Loop: `api.isLooping = true`, with an optional `api.playbackRange`.
- Count-in: `api.countInVolume = 1`. Metronome: `api.metronomeVolume = 1`.
- SoundFont: set `player.soundFont` to the sonivox SoundFont shipped in the package
  (`dist/soundfont/`; the app serves a copy from `public/vendor/alphatab/`), with
  `player.playerMode = PlayerMode.EnabledSynthesizer`.
- Big touch targets for these controls are an app concern. alphaTab does not draw them.

## Fretboard diagram

alphaTab does not render a fretboard. Build a small SVG component that reads the lesson's
`string`/`fret`/`finger` (or a voicing's `notes`), with string 6 at the bottom as players see it.
Highlight the note under alphaTab's playback cursor with `api.playedBeatChanged`.

## If alphaTab changes

If a new alphaTab version parses differently, `validate.mjs --require-alphatab` fails with a
precise message such as "finger differs" or "swing setting differs". Fix `alphatex.mjs` and re-run
`selftest.mjs`.
