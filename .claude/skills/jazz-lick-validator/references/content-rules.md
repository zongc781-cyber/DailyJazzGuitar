# Content rules

These keep the app honest about where material comes from and how reliable it is.

## Sources

- Every seed lesson cites at least one source: a recording, method book, lead sheet or teaching
  site. Name the exact book or chapter, or the recording.
- `inspiration.type: "transcription"` means a short excerpt of a named recording. Cite the
  recording as a `recording` source, and give `at` (a timestamp) when known. Keep excerpts to the
  2–4 bars needed for teaching.
- When unsure whether a phrase is a faithful transcription, use `in-the-style-of` and say whose
  vocabulary it draws on. Never attribute a lick to a player who did not play it.
- Weekly standards reproduce chord changes, the form and original exercises. Do not reproduce a
  copyrighted melody or lyrics. Point to recordings instead.

## Simplified arrangements

- `simplified` is always stated. When true, `simplificationNote` says what changed, for example:
  "Rhythm straightened from the recording", "Played an octave lower", or "Chart uses the common
  jam-session changes; recordings vary in bars 27–29".
- The UI shows a "Simplified" label next to the title whenever this is true.

## Seed vs generated

- `origin: "seed"`: written for the starter library and reviewed by a person (`review` block).
- `origin: "generated"`: created by the lesson-generation service (`generator` block). It is
  validated automatically, and is never a transcription.
- The UI labels each lesson's origin, and the library can filter by it.

## Listening links

- Use https only. Before setting `verifiedOn`, open the link and confirm it is the named
  recording by the named performer. `--check-links` re-checks that each link still loads, but
  it cannot confirm it is the right recording.

## Accuracy review before marking a seed lesson reviewed

1. Play the lick from the tab at a slow tempo and confirm it sounds like the notation.
2. Check that the analysis would make sense to an intermediate player, and that "Why this works"
   uses plain words.
3. Run the validator, then listen to alphaTab playback in two keys.
