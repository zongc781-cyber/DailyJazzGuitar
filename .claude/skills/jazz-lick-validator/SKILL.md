---
name: jazz-lick-validator
description: Lesson data format and musical-accuracy gate for the Daily Jazz Guitar app. Use whenever you write, edit, generate, transpose, render or save a daily lick or weekly jazz standard lesson; whenever you touch notation, tablature, fretboard diagrams, chord voicings, swing/metronome playback or the alphaTab integration; and whenever you build or change the lesson-generation service or the seed library. Also use it to answer "is this lick right?" questions about pitches, fingering, rhythm or analysis.
---

# Jazz lick validator

Daily Jazz Guitar teaches one jazz standard a week and one lick a day. Every lick and standard
is a single JSON file, and that file is the only source for notation, tab, fretboard diagrams,
chord names, analysis and audio. This skill defines that format and ships a validator that every
lesson must pass before anyone can see it.

The reason for one source: if notation, tab and audio are built from separate data, they drift.
A student then hears one thing, reads another and is told a third. Keep everything derived.

## The rules

1. **One data file per lesson.** Lessons live as JSON in the format in
   [references/lesson-format.md](references/lesson-format.md). Do not store alphaTex, fretboard
   dots, MIDI or rendered analysis. Derive them. The validator rejects unknown fields so derived
   data cannot sneak in.
2. **Render with alphaTab.** Use `@coderline/alphatab` (tested with 1.8.4) for standard
   notation, tablature and playback, with its built-in synth, metronome, count-in, looping and
   tempo control. Generate alphaTex with `lickToAlphaTex()` / `barsToAlphaTex()` from
   `scripts/lib/alphatex.mjs`. Do not write a custom notation renderer or audio engine, and do
   not hand-write alphaTex. See [references/alphatab.md](references/alphatab.md). The fretboard
   diagram is the one view alphaTab does not draw. Build it as a small SVG component that reads
   the same `string`/`fret`/`finger` fields.
3. **Standard tuning only.** Use E–A–D–G–B–E, low to high. String 1 is the high E and string 6
   is the low E, which is alphaTab's numbering. `pitch` is the sounding pitch (C4 = MIDI 60;
   the open low E is E2). Guitar notation is written an octave higher, and alphaTab handles that.
4. **Nothing is saved unless it passes.** Seed or generated, every lesson goes through
   `validateForPublish()` (or the CLI) before it is written to the library, and a lesson with
   errors is never shown to users. The generation service calls the same function. See
   "Generation service" below.
5. **Content honesty.** Cite sources, say when something is simplified, and mark seed vs
   generated. Details are in [references/content-rules.md](references/content-rules.md).

## Running the validator

Run from the repo root so it finds alphaTab in `node_modules` when installed:

```bash
node .claude/skills/jazz-lick-validator/scripts/validate.mjs content/            # files or folders
node .claude/skills/jazz-lick-validator/scripts/validate.mjs content/ --require-alphatab  # CI: fail if alphaTab missing
node .claude/skills/jazz-lick-validator/scripts/validate.mjs content/ --check-links       # also fetch every URL
node .claude/skills/jazz-lick-validator/scripts/selftest.mjs                     # proves each check fires
```

Exit code 0 means every lesson passed. Treat warnings as review notes, not as blockers.
Validate the whole library in one run, because duplicate IDs and repeated licks are found across
files.

What it checks:

| Brief requirement | Check |
|---|---|
| Rhythms fit the time signature | Exact fraction maths per bar, complete triplet groups, ties continue the same pitch |
| String/fret gives the intended pitch | `pitch` must equal the open-string MIDI plus the fret, on every lick, variation, guide-tone and voicing note |
| Fingering is playable | Each note implies a hand position (fret minus finger). Without a `shift` or slide the positions may differ by at most 1 and the span by at most 5 frets. No finger jumps frets. Open strings take finger 0. Hammer-ons, pull-offs and slides stay on one string |
| Analysis matches notes and chords | Every note's `degree` is recomputed from the chord sounding at its onset. `role` is checked (chord tone, tension, chromatic/diatonic approach, enclosure, passing, neighbour). Analysis points must reference notes whose roles fit the topic. Beat-placement claims and the resolution note are recomputed |
| Transposition keeps relationships | The lick is transposed to all 12 keys. Each one must re-validate, keep the same intervals, rhythm, degrees, roles and fingering, and move every chord root by the same interval |
| Swing is handled consistently | `feel` is `swing` or `straight` per lesson, with no per-lesson ratio. Generated alphaTex sets triplet feel on every bar, and the alphaTab round trip confirms it |
| Standards | The form adds up to the chart, every bar has a key centre, roman numerals match chord roots and qualities, voicings are playable and spelled right, there are 7 plan days covering all 7 focuses, and listening links are https with `verifiedOn` |
| Avoid repeats | Duplicate IDs fail. A lick with the same intervals and rhythm as another (even transposed) fails |

The alphaTab round trip parses the generated alphaTex with alphaTab's own importer. It then
checks every beat's duration, tuplet, pitch, string, finger, tie and chord name, plus time
signature and swing on every bar. It runs automatically once `@coderline/alphatab` is installed
in the project.

## Writing analysis that survives transposition

Prose must not contain absolute note or chord names, because they would be wrong in every other
key. Use tokens that the app fills in from the (possibly transposed) data:

- `{{note 2.3}}` is the note at bar 2, event 3 (1-based, rests count as events)
- `{{chord 2}}` is the second entry in that lesson's `chords` array
- `{{key}}` is the current key

Degrees ("the 3rd", "b9"), roman numerals and string names ("the A string") are fine as plain
text. The validator flags raw names such as `Bb`, `Cm7`, `C4` or "resolves to G".

## Building the app around this

- **Shared module.** The app imports `scripts/lib/index.mjs` (or a copy moved to
  `src/lib/music/` with this skill's scripts re-pointed to it). Keep exactly one copy of the
  validator. The renderer, fretboard, transposer and server save path all use it.
- **Transposition.** Call `transposeLick(lesson, tonic)` and render the result. It moves notes,
  tab, chords and key together, and the analysis follows through tokens. Offer the keys from
  `tonicsFor(mode)`. Licks must avoid open strings to be transposable. The validator already
  proved all 12 keys work, so the UI never needs a fallback.
- **Playback.** alphaTab plays the score. Tempo, looping (`playbackRange`/`isLooping`),
  count-in (`countInVolume`) and metronome (`metronomeVolume`) are alphaTab API settings. Swing
  comes only from the score's triplet feel.
- **Scheduling.** Pick lessons from the user's local date (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
  A daily lick is fixed for that local day and a standard for that local ISO week. Persist each
  published assignment, so a reload or a new generated lesson never swaps today's lesson. Never
  assign a lick ID or fingerprint already used.
- **Labels.** Show "Seed library" or "Generated" from `origin`, show "Simplified arrangement"
  when `simplified` is true, and show `sources` and `inspiration` on every lesson.

## Generation service

The generator is replaceable, but the gate is not:

1. The service, server side only, produces lesson JSON in this format with `origin: "generated"`
   and a `generator` block. API keys stay in server environment variables and are never shipped
   to the browser or committed.
2. The server runs `validateForPublish(lesson, { library, alphaTab: true })` against the whole
   published library.
3. If there are errors, discard the lesson or send the error list back to the generator for one
   retry. Never save or show a failing lesson.
4. Only a passing lesson is saved to the library and becomes eligible for scheduling.

Generated lessons may be `original` or `in-the-style-of`, and may never be `transcription`.
Without credentials, the app runs on the seed library alone.

## Files

- `scripts/validate.mjs`: the CLI
- `scripts/selftest.mjs`: proves each check fires on a deliberate mistake
- `scripts/lib/theory.mjs`: tuning, pitch spelling, chord symbols, degrees, roman numerals
- `scripts/lib/rhythm.mjs`: exact durations
- `scripts/lib/lesson.mjs`: lick and standard validation
- `scripts/lib/transpose.mjs`: transposition, fingerprints for repeats
- `scripts/lib/alphatex.mjs`: alphaTex generation
- `scripts/lib/roundtrip.mjs`: alphaTab parse-back check
- `scripts/lib/index.mjs`: `validateForPublish()` and re-exports
- `examples/lick.example.json`, `examples/standard.example.json`: complete, passing examples.
  Copy their shape. They are format fixtures, not reviewed seed content.
