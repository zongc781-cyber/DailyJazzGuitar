# Lesson content

Every lesson is one JSON file in the format defined by the `jazz-lick-validator` skill
(`.claude/skills/jazz-lick-validator/references/lesson-format.md`). That file is the only source
for the notation, tablature, fretboard diagram, chord names, analysis and audio. Nothing derived
(alphaTex, fretboard dots, MIDI) is stored.

```
content/
  curriculum.json      order of the weekly standards in the seed library
  standards/<id>.json  weekly standard lessons (seed)
  licks/<id>.json      daily lick lessons (seed)
  generated/<id>.json  lessons published by the generation service (origin "generated")
```

## The publish gate

```bash
npm run validate      # every file in content/, with the alphaTab round trip required
npm run library       # validates again and bundles the seed library for the app
```

`npm run library` runs before `dev`, `build` and `test`. If any lesson fails, the bundle is not
written and the build stops, so a failing lesson can never reach a user. The generation service
calls the same `validateForPublish()` before it saves anything.

## Curriculum

- One standard per week, in the order of `curriculum.json`.
- Each standard lists its daily licks in `lickIds`, in teaching order (easiest first). Each of
  those licks sets `standardId` back to the standard. Every seed lick belongs to exactly one
  standard.
- A lick's `practiceTask` names the bars of the standard where the lick fits.

## Seed lesson rules

- `origin: "seed"` and a `review` block. Seed lessons in this first version were written by
  Claude and checked by the validator and an independent musical read-through, so their
  `review.status` is `"awaiting-play-through"`. A person should play each lick from the tab and
  listen in two keys, then set `status` to `"reviewed"`, put their own name in `reviewedBy` and
  update `reviewedOn`. See the accuracy review in the skill's `references/content-rules.md`.
- Licks are original phrases `in-the-style-of` a named guitarist. They are not transcriptions,
  because nobody has checked them note for note against a recording. `inspiration.note` says
  which habit of that player the phrase borrows, and `sources` cites real recordings and
  teaching material that show it. Only cite a recording or book you have confirmed exists.
- Weekly standards contain chord changes, the form, analysis and original exercises. They never
  contain the melody or lyrics. `simplified` is true when the chart uses one common version of
  the changes, and `simplificationNote` says what was chosen.
- Listening links are https, and `verifiedOn` is the date someone opened the page and confirmed
  it is the named recording by the named performer.

## What makes a good daily lick

- One clear idea in 2 to 4 bars, playable in one position (mark `shift` when the hand moves).
- No open strings, so the lick moves to all 12 keys unchanged.
- Idiomatic rhythm: most licks start off the beat and land on a strong beat.
- The analysis must match the notes exactly. Prose uses `{{note bar.event}}`, `{{chord n}}` and
  `{{key}}` tokens, never raw note or chord names, so it stays right after transposition.
- "Why this works" is short and uses plain words.
- The variation changes one thing (rhythm, target note, register or approach) so the student
  hears how the idea can move.
