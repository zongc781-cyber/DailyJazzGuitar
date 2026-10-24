// What the generator is told. The system prompt is the same for every lesson (so it can be cached)
// and carries the lesson format from the jazz-lick-validator skill, bundled at build time by
// scripts/build-library.mjs. The brief changes with each plan.

import context from '../../generated/generation-context.json';
import { ReplyFormatError } from './generator';
import type { LickPlan } from './plan';

/** Bump when the instructions change, so lessons record which prompt wrote them. */
export const PROMPT_VERSION = '1';

const INSTRUCTIONS = `You write lessons for Journal, a web app for intermediate jazz guitarists. Each week the app teaches one jazz standard, and each day one short lick that helps the player improvise over that standard. You write one daily lick per request.

A lesson is one JSON object. The app draws standard notation, tablature, the fretboard diagram and the analysis view from it and plays it back, so every field has to be exactly right. Before the lick is published, a validator checks:
- each pitch against its string and fret in standard tuning (E A D G B E; string 1 is the high E)
- the rhythm of every bar against the time signature
- that the fingering is playable
- every note's degree and role against the chord sounding at that note
- that the analysis points at notes whose roles fit, and that its beat placements and resolution are true
- that the lick, the variation and the analysis still work when transposed to all 12 keys
- that the lick does not repeat the intervals and rhythm of a lick already in the library

If the validator finds problems, you get the list once to fix them. If the second version fails too, it is thrown away.

## What to write

- An original phrase of 2 to 4 bars in the style of the guitarist named in the request, over exactly the chords given. Draw on the habits described for that player, but do not reproduce a recorded solo, and do not quote the standard's melody.
- Single notes only, and no open strings, so the lick can move to every key.
- Put chord tones on strong beats and show how the line moves from one chord into the next. End on a clear target in the last chord: that is the analysis's resolution.
- Spell every pitch for the harmony, and give every note a degree and a role. A tied continuation note has neither.
- whyItWorks: two to four plain sentences for a player who knows basic chords but not much theory.
- variation: one small change that keeps the idea (a different rhythm, a different landing note, or the same shape over a related chord), with a one-sentence description.
- practiceTask: one concrete task that takes the lick into the weekly standard, such as playing it over the bars it was written for and then over a similar passage elsewhere in the tune.
- fingeringNote: where the hand sits and where it shifts, in words. Fret numbers in prose refer to the key the lick is written in.
- difficulty: 1 (easy) to 5, honestly.
- Prose must not contain note or chord names, because it has to stay true in every key. Use the tokens described below.

## Honesty

- inspiration is {"type": "in-the-style-of", "artist": the guitarist named in the request, "note": one or two sentences on which of the player's habits the phrase borrows}. Never claim that a recording contains this phrase.
- Set sources to an empty array, and leave out review and generator. The app adds the sources (recordings chosen by a person) and the provenance itself.
- Set simplified to false unless you leave something out on purpose; then say what in simplificationNote.`;

const SYSTEM = [
  INSTRUCTIONS,
  `## The lesson format\n\n${context.formatReference}`,
  `## Prose tokens\n\n${context.tokenRules}`,
  `## Content rules for the whole library\n\nSome of these apply only to seed lessons, which people write and review.\n\n${context.contentRules}`,
  `## A complete example\n\nThis lesson passed the validator as a seed lesson. Copy its shape, not its notes, and follow the Honesty section above for origin, inspiration and sources.\n\n\`\`\`json\n${JSON.stringify(context.exampleLick, null, 2)}\n\`\`\``,
  `## Your reply\n\nReply with the complete lesson as one JSON object in a single \`\`\`json code block, and nothing else.`,
].join('\n\n');

export function systemPrompt(): string {
  return SYSTEM;
}

export function briefMessage(plan: LickPlan): string {
  const { standard: s, key, bars, section, guitarist, chords, existing } = plan;
  const passage = s.chart
    .slice(bars[0] - 1, bars[1])
    .map((bar) => bar.chords.map((c) => (c.beat === 1 ? c.symbol : `${c.symbol} (beat ${c.beat})`)).join(', '))
    .join(' | ');
  const lines = [
    `Write the daily lick with id "${plan.id}".`,
    '',
    `Standard: ${s.title} by ${s.composers.join(' and ')} (${s.year}). Form: ${s.form.label}, ${s.chart.length} bars. Feel: ${s.feel}. Time signature: ${s.timeSignature.join('/')}. Usual tempos: ${s.tempo.min} to ${s.tempo.max} BPM.`,
    '',
    `Passage: bars ${bars[0]} to ${bars[1]} of the form${section ? ` (section ${section})` : ''}, in ${key.tonic} ${key.mode}: | ${passage} |`,
    '',
    "Use exactly these chords, in this order, as the lick's chords:",
    JSON.stringify(chords),
    '',
    `Set key to ${JSON.stringify(key)}, timeSignature to ${JSON.stringify(s.timeSignature)} and feel to "${s.feel}". Choose a practice tempo range that suits the lick.`,
    '',
    `Guitarist: ${guitarist.name}. Vocabulary to draw on: ${guitarist.vocabulary}`,
  ];
  if (existing.length) {
    lines.push('', 'Licks already written over this standard. Do not repeat their ideas:');
    for (const l of existing) lines.push(`- "${l.title}"${l.artist ? ` (in the style of ${l.artist})` : ''}`);
  }
  return lines.join('\n');
}

export function revisionMessage(problems: string[]): string {
  return [
    'The validator rejected this lesson:',
    '',
    ...problems.map((p) => `- ${p}`),
    '',
    'Fix every problem and reply with the complete corrected lesson as one JSON object in a single ```json code block. Keep everything that was already right.',
  ].join('\n');
}

/** Reads the lesson object out of a reply, or throws ReplyFormatError saying what was wrong. */
export function parseLessonReply(text: string): unknown {
  const fenced = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(text);
  const body = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!body.trim()) throw new ReplyFormatError('The reply did not contain a JSON object.');
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch (e) {
    throw new ReplyFormatError(`The reply was not valid JSON: ${(e as Error).message}`);
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new ReplyFormatError('The reply must be one JSON object (the lesson).');
  return json;
}
