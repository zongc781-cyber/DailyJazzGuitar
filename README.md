# Daily Jazz Guitar

One jazz standard each week, and one short lick each day that helps you improvise over it.

- **Today**: the day's lick (2–4 bars) with standard notation, tab, fingering, chord symbols and a
  fretboard diagram. Playback has adjustable tempo, looping, count-in and metronome. You can
  move the lick to any key, and notation, tab, audio and analysis move together. The analysis
  (chord tones, extensions, approach notes, rhythmic placement and resolution) stays hidden until
  you press **Show analysis**. Each lick also has "Why this works", a variation and a practice task
  over the week's standard.
- **This Week**: the standard: composer, form, key centres, checked listening links, a chord chart
  with roman-numeral analysis and common variations, guitar voicings, guide-tone exercises,
  improvisation ideas and a seven-day plan (listening, harmony, comping, arpeggios, vocabulary,
  improvisation, self-review).
- **Library**: every lesson you have been given, the ones you marked as learned (with the date
  and the key you learned them in), your favourites, and the whole library filtered by seed or
  generated.
- **Progress**: streak, practice calendar, your notes, preferences, and export, import or reset.

Progress is kept in your browser (localStorage). Nothing about you is sent to the server.

## Run it

Node 22.6 or later.

```bash
npm install        # also copies alphaTab's fonts, worker and SoundFont into public/vendor
npm run dev        # validates the library, then serves http://localhost:3000
npm run build && npm start
```

## Checks

```bash
npm run validate   # every lesson through the publish gate, alphaTab round trip required
npm run selftest   # proves the validator catches each kind of mistake
npm run typecheck
npm run lint
npm test           # unit tests: scheduling, generation pipeline, lesson store, progress
npm run test:e2e   # Playwright on a phone and a desktop viewport (builds and serves on port 3100)
```

`dev`, `build`, `test` and `typecheck` first run `npm run library`, which validates every seed
lesson and bundles the library. If any lesson fails, the build stops.

## How it fits together

```
content/*.json ──validateForPublish──▶ src/generated/seed-library.json ─┐
content/generated/*.json (generation service) ──────────────────────────┴▶ server: catalogue + /api/lessons/[id]
                                                                           │
browser: picks today's lick and this week's standard from the local date ◀─┘
         and saves each assignment, so a reload or a new lesson never swaps it
         lesson JSON ──lickToAlphaTex──▶ alphaTab (notation, tab, audio)
                     └──────────────────▶ fretboard SVG, analysis, transposition
```

- **One source per lesson.** Each lick or standard is one JSON file in the format defined by the
  `jazz-lick-validator` skill (`.claude/skills/jazz-lick-validator/`). Notation, tab, audio,
  fretboard, chord names and analysis are all derived from it.
- **Musical accuracy.** The validator (`src/lib/music/`) checks rhythm against the time signature,
  every pitch against its string and fret in standard tuning, fingering, every degree and role
  against the chord sounding at that note, the analysis against the notes, the lick in all 12
  keys, consistent swing, repeats across the library, and an alphaTab parse-back of the generated
  score.
- **Scheduling** (`src/lib/schedule.ts`) uses the learner's local calendar: a lick is fixed for the
  local day and a standard for the local ISO week. A lick is not repeated until all of that
  standard's licks have been used, and then it comes back marked as review.

## Content

The seed library has 2 standards (Autumn Leaves and Blue Bossa) and 14 daily licks, 7 for each.

- Every seed lesson was written by Claude and passed the validator. Their `review` blocks say they
  are **awaiting a human play-through**. Please play each lick from the tab, listen in two keys,
  and then put your name in `reviewedBy` (see `content/README.md`).
- Licks are original phrases **in the style of** a named guitarist, never transcriptions. Each one
  cites recordings and teaching material that were opened and checked.
- Standards contain chord changes, form, analysis and original exercises. They never contain the
  melody or lyrics.
- Every lesson is labelled "Seed library" or "Generated", and the library can filter by origin.

## Lesson generation

The app runs on the seed library alone. A generation service can add new daily licks; it is off
until the server has credentials.

**What it does** (`src/server/generation/`):

1. **Plan**: pick the standard with the fewest licks, a 2–4 bar passage of its chart inside one
   key centre that no lick covers yet, and the least-used guitarist from a hand-checked list
   (`guitarists.ts`, whose recordings become the lesson's sources).
2. **Generate**: the generator writes the lesson JSON. The prompt quotes the lesson format straight
   from the skill, so the prompt and the validator cannot drift apart.
3. **Publish gate**: the pipeline sets the id, origin, provenance, standard and sources, checks the
   draft matches the brief (chords, key, metre, guitarist, never a transcription), and runs
   `validateForPublish` against the whole published library.
4. **One revision**: if anything fails, the problems go back to the generator once. A lesson that
   still fails is discarded. Only passing lessons are saved.

**Set it up.** Put these in the server environment only (for local use, `.env.local`, which is git
ignored). Never commit them or give them a `NEXT_PUBLIC_` prefix.

| Variable | |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `LESSON_MODEL` | The Claude model that writes lessons, as a model ID from [Anthropic's model list](https://docs.anthropic.com/en/docs/models-overview). Pick a current model that supports adaptive thinking |
| `CRON_SECRET` | Turns on `/api/cron/generate` (optional) |
| `GENERATED_LESSONS_DIR` | Where passing lessons are saved (default `content/generated`) |
| `LESSON_FALLBACKS` | Server-side fallback is on by default: if the chosen model cannot serve a request, the API may answer with a fallback model, and the lesson records which model wrote it. Set to `off` to turn it off |
| `LESSON_GENERATION` | Set to `off` to turn generation off without removing the key |

**Run it.**

```bash
npm run generate                  # write, validate and publish one lick
npm run generate -- --count 3     # three licks, each planned after the previous one is saved
npm run generate -- --dry-run     # print the lesson instead of saving it
```

Lessons are saved to `content/generated/<id>.json`. Commit them to ship them with the app.

**On a schedule.** Call the endpoint once a day with the secret:

```bash
curl -X POST https://your-app.example/api/cron/generate -H "Authorization: Bearer $CRON_SECRET"
```

Vercel Cron, a GitHub Actions schedule or any cron service can do this. The default store writes
files, so it needs a writable disk: on a serverless host, either run `npm run generate` and commit
the files, or implement `LessonStore` (`src/server/store.ts`) with a database. The endpoint checks
that the store is writable before it spends a request.

Each lesson takes one or two requests. The instructions are the same for every lesson and are
cached between requests.

**Use another service.** Implement `LessonGenerator` (`src/server/generation/generator.ts`) and
return it from `createGenerator()` in `src/server/generation/index.ts`. The planner and the
publish gate stay the same.

## Layout

```
content/                      lessons (JSON) and curriculum order; see content/README.md
src/app/                      pages (Today, This Week, Library, Progress, lesson pages) and API routes
src/components/               player (alphaTab, transport, fretboard), lesson, standard and screen components
src/lib/music/                lesson format, validator, transposition, alphaTex (shared with the skill's CLI)
src/lib/progress/             browser progress store
src/server/                   published library, lesson store, generation service
scripts/                      library build, alphaTab copy, generation CLI
tests/                        unit (node:test) and end-to-end (Playwright) tests
.claude/skills/               jazz-lick-validator, plus the Vercel agent skills used to build the UI
```

Notation, tablature and playback are drawn by [alphaTab](https://alphatab.net) (MPL-2.0).
