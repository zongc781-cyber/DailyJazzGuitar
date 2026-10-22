# Design: the lead sheet and the blue pencil

Daily Jazz Guitar looks like a jazz lead sheet that a teacher has marked up with a blue pencil:
cream manuscript paper, black ink type, staff-line hairlines, Real Book handwriting for chord
symbols and boxed rehearsal letters for sections. Blue is the only accent. It is the pencil, so it
marks what matters: the primary action, where you are, and the playful hand-drawn marks (ticks
that draw themselves, circles, underlines).

The app is for a desktop browser on a Mac. Layouts are designed at 1440×900 and still work down to
a 720-pixel window, where the side rail shrinks to icons.

## Principles

- **Calm.** Paper, ink and space do most of the work. Hairlines instead of shadows; one soft shadow
  for the score sheet.
- **Editorial.** Big serif headlines, readable text at 17px, small uppercase labels, strong
  contrast between the three. Copy is specific: it says what to do and why.
- **One accent.** Blue marks the primary action, the current place, focus and pencil marks. Nothing
  else on the page is blue. The analysis colours on the score and fretboard are data, shown only
  when the analysis is on.
- **Playful in the details.** Handwritten notation and chords, pencil ticks that draw themselves,
  the chosen tempo circled in pencil, a dashed ring that turns round Play like a record while it
  plays, chips that tilt a little on hover. Never at the cost of clarity, and motion is always off
  under reduced motion.
- **Varied composition, one system.** Each section of a page takes a different shape (title block,
  track list, chart, grid, numbered notes, timeline) built from the same tokens and parts.

## Tokens (src/app/globals.css)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | #F5F2EA | #111214 | page |
| `--surface` | #FBF9F4 | #18191C | cards, score sheet |
| `--surface-2` | #EDE9DF | #202125 | quiet fills, hover |
| `--ink` | #15161A | #EEEBE4 | text |
| `--ink-2` | #44464D | #C9C6BF | supporting text |
| `--ink-3` | #66676D | #9C9A94 | labels, meta (4.5:1 or better) |
| `--line` | #DEDACF | #2E2F34 | hairlines |
| `--line-strong` | #C5C0B4 | #44454B | control borders |
| `--accent` | #2450D8 | #8BA3FF | the blue pencil |
| `--accent-strong` | #1A3DB0 | #B0C1FF | hover and pressed |
| `--accent-soft` | #E4EAFB | #1D2646 | selected fills |
| `--accent-ink` | #FFFFFF | #0B0D14 | text on blue |

Type:

- `--font-display`: Instrument Serif (400, italic). Headlines and big numbers. Italic for the
  supporting line under a headline and for pencil-like asides.
- `--font-ui`: Instrument Sans (variable weight and width). Everything else.
- `--font-chord`: Petaluma Script (Steinberg's handwriting font, after the Real Book). Chord
  symbols only, plus the occasional handwritten note.
- The score: alphaTab draws the notation in Petaluma, Steinberg's handwritten SMuFL music font,
  and the chord names above the staff in Petaluma Script, so the sheet reads like a hand-copied
  chart. `scripts/copy-alphatab.mjs` copies the font and its SMuFL metrics beside alphaTab; if
  they fail to load, alphaTab falls back to its engraved Bravura.

Scale: hero headline 56–84px (line-height 1), page headline 48–64px, section heading 34px,
card heading 22px, body 17px/1.6, small 14px, label 12px uppercase with 0.08em tracking.

Space: 4px grid. Sections are 72px apart in a wide window and 48px in a narrow one. Cards have
24–32px padding. Radii: 6px (chips, inputs), 10px (cards), pill (buttons).

## Parts

- **Rehearsal heading**: a boxed letter (A, B, C…) and a serif heading, like the section marks of a
  chart. Letters run in order down a page.
- **Buttons**: primary is a blue pill; secondary is an ink outline pill; quiet is text that
  underlines on hover. One primary action per view.
- **Chord chip**: the chord in Petaluma Script on paper with a hairline border.
- **Score sheet** (`ScoreSheet` in `PlayerScore.tsx`): the score and its playback bar joined on
  one sheet, the one card with a soft shadow. The bar sticks to the bottom of the window while the
  sheet runs on below it, so Play is always in reach.
- **Playback bar**: the blue Play (the page's primary action), an outline Stop, tempo presets (the
  chosen one circled in pencil), a thin slider that fills with blue, and pill toggles for loop,
  count-in and metronome: filled when on, an empty outline when off. It follows its own width: one
  row when there is room, play and toggles over a one-line tempo in a narrower window, and
  everything stacked below 560px.
- **Pencil marks**: hand-drawn SVG strokes in `--accent`: a tick (draws itself when you tick a
  task), an underline (active tab, current place) and a circle.
- **Staff rule**: five hairlines, used sparingly as an ornament between major parts.
- **Labels**: 12px uppercase Instrument Sans, `--ink-3`.
- **Copy**: lesson text is set with real flats and sharps on degrees and roman numerals ("the ♭9",
  "V7♭9") and curly quotes, by `typeset` in `src/lib/text.ts`. Chord symbols are drawn by
  `prettyChord`. Lesson data itself stays in ASCII.

## Screens

- **Today**: a title block: the label with a small "This week" link at its right, the lick's
  title as the headline, an italic line saying whose style it is and which tune it is for, then
  the chords in handwriting with Learned and Favourite at the right. A hairline, the key, line and
  analysis controls, then the score sheet, where the blue Play is the primary action. At 1440×900
  the whole sheet is on the first screen. Then the fretboard with the fingering note, the liner
  notes ("Why this works", with a drop cap) and the practice task beside the checklist and a
  ruled notes field, the line as text, and the credits.
- **This Week**: the tune's title block (feel and tempo handwritten at the left, composer and
  year at the right, over a staff rule), links to each section by its rehearsal letter, then
  sections A to H. A: today's practice as a card with the day circled in pencil and one blue
  button that depends on the day. B: the recordings as a track list. C: the chord chart copied out
  by hand, one slash per beat, with boxed section marks; with the analysis shown, roman numerals
  under the staff and key centres shaded in green and purple (never the accent blue), then how
  the changes work and common variations. D: voicings as a chord picker with the shapes of the
  chosen chord. E: guide-tone exercises on a score sheet. F: improvisation ideas as numbered
  notes. G: the seven-day plan as a timeline with today circled. H: the week's licks as a set
  list.
- **Library** ("Your back catalogue"): serif tabs with a pencil underline and counts as
  superscripts. History files each day's lick under its week's standard with today's date
  circled; Learned is grouped by month; Favourites is a two-column shelf; All lessons groups the
  book by standard under rehearsal letters, with search and filters. Learned ticks and favourite
  hearts line up in one column.
- **Progress** ("The woodshed"): the streak as a big serif number with one blue button, a
  six-month practice calendar in shades of blue with today circled, lessons learned drawn as
  filled note heads on a staff, then notes, preferences (with small previews) and your data
  (import and reset each ask first).
- **Not found and errors**: a multi-bar rest marked 404, and a line with the wrong note circled;
  one sentence and one primary button each.
