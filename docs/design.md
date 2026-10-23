# Design: big type on white and blue

Daily Jazz Guitar is set like a studio's portfolio site (the reference was cominvi.com.mx and its
Awwwards entry): white pages, big fields of blue, black type, very large titles, and one idea per
screen. Details wait behind a big title until you click it.

The app is for a desktop browser on a Mac. Layouts are designed at 1440×900 and still work down to
a 720-pixel window.

## Principles

- **Little text per screen.** A screen holds one idea: a title, a line or two, one action. The
  rest sits behind big titles that open when asked.
- **Very big titles.** A page's first title is set at `--text-hero` (56–160px); section and row
  titles at `--text-display` (42–96px). Instrument Sans at weight 500, tight tracking.
- **No frames.** No cards, no boxes around content, no shadows. Hairlines (`--line`) divide rows;
  controls are filled pills (`--surface-2`, or blue for the one primary action) or plain words.
- **White, blue and black.** White pages, blue fields (each lesson's first screen, the closing
  link), black type. Blue also marks what is chosen or done: the chosen word is blue and
  underlined, a done task fills with blue. At night the page turns deep navy and the fields stay
  blue, so blue and white still lead.
- **Motion with a purpose.** A first title's words rise into place, rows open with a short fade,
  arrows move on hover, Play pulses while it plays. All of it is off under reduced motion.
- **The jazz is in the music.** The score is in Petaluma (handwritten SMuFL notation) and chord
  symbols are in Petaluma Script, the Real Book hand. Those are the only handwriting on the page.

## Tokens (src/app/globals.css)

| Token | Light | Night | Use |
| --- | --- | --- | --- |
| `--paper` | #FFFFFF | #0A1033 | page |
| `--surface-2` | #F2F4FA | #131B46 | quiet fills: secondary buttons, icons, hover |
| `--surface-3` | #E7EAF3 | #1B2457 | hover on a quiet fill |
| `--ink` | #0B0D12 | #FFFFFF | text |
| `--ink-2` | #3A3F4B | #C9CFE8 | supporting text |
| `--ink-3` | #5F6573 | #9BA4C9 | labels, meta (4.5:1 or better) |
| `--line` | #E4E7EF | #1F2858 | hairlines |
| `--line-control` | #868C9B | #7A84B3 | lines that are controls (3:1) |
| `--accent` | #1F3DFF | #8EA0FF | chosen, done, links on hover, focus |
| `--accent-soft` | #EEF1FF | #18225A | soft fill of a chosen pill |
| `--field` | #1F3DFF | #1F3DFF | blue fields |
| `--field-ink` / `--field-ink-2` | #FFFFFF / #DBE0FF | same | text on a field (6.6:1, 5.1:1) |

Inside a blue field (`.blue` in blocks.module.css) the ink, accent and line tokens are remapped to
the field's whites, so any part placed on blue works without changes.

Type, all Instrument Sans (`--font-display` and `--font-ui` are the same family):

- `--text-hero` clamp(56px, 0.4rem + 7.6vw, 160px): the first title of a page, line-height 0.9,
  tracking −0.05em, slightly narrowed (`font-stretch: 94%`).
- `--text-display` clamp(42px, 0.9rem + 4vw, 96px): section titles and row titles.
- `--text-title` clamp(30px, 1.3rem + 1.4vw, 44px): titles inside a section.
- `--text-lead` clamp(19px, 1rem + 0.5vw, 24px): the line under a title, and text a row opens on.
- Body 18px/1.6; labels 12.5px uppercase, tracking 0.08em.
- `--font-chord`: Petaluma Script, for chord symbols only.

Space: `--page-inline` is every block's left and right padding (the gutter, 28–72px, or wider on
a very wide window so content stays within `--wide`, 1560px). Sections sit 72–136px apart.

## Blocks (src/components/ui)

- **Hero** (`Hero.tsx`): the first screen of a page. A top row (small uppercase label at the
  left, facts or a back link at the right), then the title, a line or two, and one action.
  `tone="blue"` fills the window below the bar and turns the bar blue with it (the shell uses
  `:has(main [data-hero='blue'])`). `tone="plain"` is a white header with the same huge title and
  no fixed height, for pages that are tools rather than lessons. The action on blue is
  `ui.button ui.onField ui.large`; on white, `ui.button ui.primary ui.large`.
- **SectionHead** (`Hero.tsx`): "01  Play it": a small blue index and a `--text-display` title,
  for a section that is always open because it is the point of the page.
- **Reveal** (`Reveal.tsx`): a row with a small blue index, a `--text-display` title, an optional
  fact at the right ("2 of 7 done") and a round plus that turns into a minus. Rows stack on
  hairlines in a `RevealList`. A row opens when clicked, when the address names its id, or when a
  link to `#id` is followed, so a button in the hero can lead straight into it. Its panel is
  indented to the title's left edge; text in it is set at `--text-lead` when it is a few lines.
- **NextLink** (`NextLink.tsx`): the end of a page: a blue band with a small label, the next
  place's name at `--text-display`, a line under it and a white circle with an arrow.
- **Buttons** (`ui.module.css`): `button` is a quiet pill on `--surface-2`; `primary` is blue;
  `onField` is white with blue words; `large` for a first screen's action; `small` for minor
  actions. One primary action per screen.
- **Chosen words**: a segmented control, tempo presets and similar choices are plain words; the
  chosen one is blue with a 2px underline that grows from the left.
- **Checkboxes**: a ring that fills with blue and shows a white check.
- **Fields**: a select is a word on a line; notes are ruled lines with no box.

## Screens

- **Today** and a lick opened from the library: a blue first screen with the label (date, or a
  link back to the library tab), the facts at the right, the lick's title, whose style it is and
  which tune it is for, the chords in handwriting and "Start practising". Then **01 Play it**:
  key, line and analysis controls; the score and its playback bar with no frame (the bar sticks to
  the bottom of the window while the score runs on); the fretboard with the fingering note; the
  analysis when it is asked for; Learned and Favourite. Then rows: Why it works, Practice (with
  "n of 7 done"), Use it on the tune, Your notes, The notes as text, Sources and credits. The page
  ends on a blue band that leads to this week's standard.
- **This Week** and a standard opened from the library: a blue first screen with the tune's
  title, composer and feel, today's focus and one action that depends on the day. Then the parts
  you use every day are always open (today's tasks and the chord chart, under section heads) and
  the rest are rows (listening, voicings, guide tones, ideas, the seven-day plan, the week's
  licks, notes, sources). The page ends on a blue band that leads to the day's lick.
- **Library**: a white header with a huge title, the tabs as large words with counts, and lists
  as rows on hairlines: the title large, the details small, learned and favourite marks in one
  column.
- **Progress**: the streak as the title of a blue first screen, then the practice calendar in
  shades of blue, and rows for what you have learned, your notes, preferences and your data.
- **Not found and errors**: a blue first screen with a big title, one sentence and one button.
