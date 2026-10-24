# Lesson format (schemaVersion 1)

Two kinds of lesson share one format family: `"kind": "lick"` and `"kind": "standard"`.
Complete, passing examples are in `../examples/`. Unknown fields are errors.

## Contents

1. Shared fields
2. Events (the note format)
3. Lick
4. Standard
5. Degree and role vocabulary

## 1. Shared fields

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | `1` | |
| `kind` | `"lick"` or `"standard"` | |
| `id` | slug | Unique across the library, e.g. `"wes-octave-approach-01"` |
| `title` | string | |
| `origin` | `"seed"` or `"generated"` | Shown to the user |
| `review` | `{status, reviewedBy, reviewedOn}` | Required for seed lessons. `status` is `"reviewed"` once a person has played the lesson through (the accuracy review in content-rules.md), and `"awaiting-play-through"` while it has only been checked |
| `generator` | `{service, version, generatedAt}` | Required for generated lessons, forbidden on seed |
| `sources` | `[{title, kind, author?, url?, year?, detail?}]` | `kind` is one of recording, book, method, website, video or lead-sheet. Seed lessons need at least one source. URLs must be https |
| `simplified` | boolean | Always stated |
| `simplificationNote` | string | Required when `simplified` is true |
| `key` | `{tonic:"Bb", mode:"major"\|"minor"}` | |
| `timeSignature` | `[4, 4]` | |
| `feel` | `"swing"` or `"straight"` | The only swing control. The swing ratio is app-wide (triplet feel) |
| `tempo` | `{min, default, max}` | BPM, 30 to 360 |
| `tags` | string[] | Optional |

## 2. Events

A line is `bars: [{events: [...]}]`. Each event is a note or a rest, single notes only.

```json
{ "dur": "8", "string": 3, "fret": 5, "pitch": "C4", "finger": 1, "degree": "1", "role": "chord-tone" }
{ "dur": "8", "rest": true }
{ "dur": "8", "tuplet": 3, "string": 4, "fret": 5, "pitch": "G3", "finger": 1, "degree": "5", "role": "chord-tone" }
{ "dur": "4", "string": 3, "fret": 7, "pitch": "D4", "finger": 3, "tie": true }
```

| Field | Notes |
|---|---|
| `dur` | `"1" "2" "4" "8" "16" "32"` (a string) |
| `dots` | 1 or 2 |
| `tuplet` | 3. Consecutive triplet events must form complete groups |
| `rest` | true. A rest has no note fields |
| `string` | 1 = high E … 6 = low E |
| `fret` | 0–20 |
| `pitch` | Sounding scientific pitch, which must equal the tuning at that string and fret. Spell it for the harmony (G#3 vs Ab3) |
| `finger` | 0 for an open string, 1–4 for fretted notes, `"T"` for the thumb (string 6 only) |
| `degree` | Interval above the root of the chord sounding at this note's onset (see section 5) |
| `role` | See section 5 |
| `tie` | Continues the previous note on the same string and pitch. It carries no degree or role |
| `technique` | `"h"` hammer-on, `"p"` pull-off or `"sl"` slide, arriving at this note from the previous one on the same string |
| `shift` | true when the hand changes position at this note. This resets the fingering window |

`chords` place chord symbols on the timeline: `[{symbol, bar, beat}]`, in time order, with the
first chord at bar 1 beat 1 and beats in halves (`2.5` is the "and" of 2). A chord change must
coincide with an event onset, so split a note with a tie if needed.

Accepted chord suffixes: (none), maj7, maj9, maj7#11, 6, 69, m, m7, m9, m11, m6, mMaj7, 7, 9, 13,
7b9, 7#9, 7#11, 7b13, 7#5, 7b9b13, 7alt, 7sus4, 9sus4, m7b5, dim7, dim, aug. These aliases are
also accepted: M7, Δ, Δ7, -7, min7, -, ø, ø7, °7, o7, °, +, 6/9 and others in `theory.mjs`.
Slash bass is allowed: `C7/E`.

## 3. Lick

Required, besides the shared fields:

- `inspiration`: `{type, artist?, recording?, year?, at?, note?}`. `type` is `transcription`
  (a short excerpt of a named recording, which needs `artist`, `recording` and a `recording`
  source), `in-the-style-of` (needs `artist`), `original` or `method-exercise`.
- `chords`, and `bars` with 2 to 4 bars.
- `analysis`:
  - `summary`: prose.
  - `points: [{topic, notes:[[bar,event],...], text, onsetBeats?}]`. Topics are chord-tones,
    tensions, approach, rhythm and resolution. All except tensions are required, and tensions is
    required exactly when some note has role `tension`. Referenced notes must have roles that fit
    the topic. `onsetBeats` (1-based quarter-note beats, e.g. 1.5 = "and of 1") is checked
    against the real rhythm.
  - `resolution: {note:[bar,event], degree, onsetBeat?}`, checked against the note.
- `whyItWorks`: short, plain-language prose.
- `variation: {description, bars (1–4), chords?}`. Its chords default to the lick's chords.

Optional: `standardId`, `practiceTask`, `fingeringNote`, `difficulty` (1–5).

## 4. Standard

- `composers` (string[]) and `year`.
- `form: {label:"AABA", bars?, sections:[{label, bars}]}`.
- `chart`: one entry per bar of the form, `[{chords:[{symbol, beat, roman, keyCenter?}]}]`.
- `keyCenters: [{tonic, mode, bars:[first,last]}]`, covering every bar.
- Roman numerals are measured from the key centre's tonic on major-scale degrees, with explicit
  accidentals: in G minor, Ebmaj7 is `bVImaj7`, Bb7 is `bIII7` and Fm7 is `bvii7`. Case gives
  the quality: upper case for major or dominant, lower case for minor, `ø7` for half-diminished
  and `o7` for diminished. Use `V7/ii` for secondary dominants, or set `keyCenter` on one chord.
- `listening: [{performer, recording, album?, year, url, verifiedOn, note?}]`, at least 2.
  `verifiedOn` means someone opened the link and confirmed it is that recording.
- `analysis: {summary, sections?:[{label,text}], variations:[{name, chords:[{bar,beat,symbol,roman}], text}]}`.
- `voicings: [{symbol, name, notes:[{string, fret, finger, pitch, degree}], note?}]`. One note
  per string, a span of at most 4 frets, and one finger per fret (a barre is one finger on one
  fret).
- `guideToneExercises: [{title, description, chords, bars}]`. These are events, validated like a lick.
- `improvisation: [{title, text}]`.
- `practicePlan`: exactly 7 entries `{day:1..7, focus, minutes, tasks[], lickId?}`. The 7 focuses
  are listening, harmony, comping, arpeggios, vocabulary, improvisation and self-review, each used
  once.
- `lickIds`: optional links to daily licks.

## 5. Degree and role vocabulary

Degrees (semitones above the chord root): `1`=0, `b9`=1, `9`=2, `#9`/`b3`=3, `3`=4, `4`/`11`=5,
`#11`/`b5`=6, `5`=7, `#5`/`b13`=8, `6`/`13`/`bb7`=9, `b7`=10, `7`=11. Pick the label that names
the function. In a minor chord, 3 semitones is `b3`. Over a dominant chord it is `#9`.

| Role | Rule |
|---|---|
| `chord-tone` | The degree is in the chord (including its 6th or altered 5th) |
| `tension` | 9, 11 or 13 (natural or altered) that is not already a chord tone. A natural 11 over a major 3rd gives a warning |
| `approach-chromatic` | A half step into the next note, which is a chord tone or tension |
| `approach-diatonic` | A half or whole step into the next note, which is a chord tone or tension |
| `enclosure` | A run of notes within a minor 3rd around the next target, from above and below, then the target (a chord tone or tension) |
| `passing` | A step between two notes, continuing in the same direction |
| `neighbor` | A step away and back to the same pitch |
| `scale` | Any other scale tone. Only the degree is checked |
