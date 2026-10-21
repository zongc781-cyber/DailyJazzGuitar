// alphaTex output for alphaTab (https://alphatab.net). alphaTab draws standard notation and
// tab from this text and plays it back with its built-in synth, so notation, tab and audio all
// come from the same lesson JSON. Never hand-edit alphaTex; regenerate it from the lesson.

import { Frac, eventLength, barLength } from './rhythm.mjs';
import { parseChord } from './theory.mjs';

const q = (s) => `"${String(s).replace(/(["\\])/g, '\\$1')}"`;

// alphaTex left-hand fingers: 1 = thumb, 2 = index, 3 = middle, 4 = ring, 5 = little.
export const toAlphaTexFinger = (finger) => (finger === 'T' ? 1 : finger + 1);

/**
 * Convert bars + chords to alphaTex bar content. Throws if a chord change falls inside a
 * note, because alphaTab attaches chord names to beats.
 */
export function barsToAlphaTex(bars, chords, ts) {
  const bl = barLength(ts);
  const chordAt = new Map();
  for (const c of chords ?? []) {
    const pos = bl.mul(new Frac(c.bar - 1)).add(new Frac(Math.round((c.beat - 1) * 2), 2 * ts[1]));
    chordAt.set(pos.toString(), c.symbol);
  }
  const used = new Set();
  const events = bars.flatMap((b) => b.events);
  const out = [];
  let t = new Frac(0);
  let i = 0;
  bars.forEach((bar, bi) => {
    const parts = [];
    for (const ev of bar.events) {
      const key = t.toString();
      const beatFx = [];
      if (ev.dots === 1) beatFx.push('d');
      if (ev.dots === 2) beatFx.push('dd');
      if (ev.tuplet === 3) beatFx.push('tu 3');
      if (chordAt.has(key)) { beatFx.push(`ch ${q(chordAt.get(key))}`); used.add(key); }
      let head;
      if (ev.rest) head = `r.${ev.dur}`;
      else {
        const noteFx = [];
        if (!ev.tie && ev.finger !== undefined && ev.fret > 0) noteFx.push(`lf ${toAlphaTexFinger(ev.finger)}`);
        const next = events[i + 1];
        if (next && !next.rest && next.technique === 'h') noteFx.push('h');
        if (next && !next.rest && next.technique === 'p') noteFx.push('h'); // alphaTex uses h for both directions
        if (next && !next.rest && next.technique === 'sl') noteFx.push('sl');
        const fret = ev.tie ? '-' : String(ev.fret);
        head = `${fret}.${ev.string}${noteFx.length ? `{${noteFx.join(' ')}}` : ''}.${ev.dur}`;
      }
      parts.push(beatFx.length ? `${head} {${beatFx.join(' ')}}` : head);
      t = t.add(eventLength(ev));
      i++;
    }
    out.push(parts.join(' '));
    void bi;
  });
  for (const k of chordAt.keys()) if (!used.has(k)) throw new Error(`chord ${chordAt.get(k)} starts in the middle of a note; split that note with a tie so the change has a beat`);
  return out;
}

/** Full alphaTex score for a lick (or its variation when {variation:true}). */
export function lickToAlphaTex(lick, { variation = false } = {}) {
  const bars = variation ? lick.variation.bars : lick.bars;
  const chords = variation ? (lick.variation.chords ?? lick.chords) : lick.chords;
  const ts = lick.timeSignature;
  for (const c of chords) if (!parseChord(c.symbol)) throw new Error(`bad chord ${c.symbol}`);
  const body = barsToAlphaTex(bars, chords, ts);
  const swing = lick.feel === 'swing';
  // Bar metadata is repeated on every bar so swing can never drift between bars.
  const barText = body.map((b) => `${swing ? '\\tf triplet8th ' : '\\tf none '}${b}`);
  barText[0] = `\\ts ${ts[0]} ${ts[1]} ${barText[0]}`;
  return [
    `\\title ${q(lick.title + (variation ? ' (variation)' : ''))}`,
    `\\tempo ${lick.tempo.default}`,
    '.',
    '\\track "Guitar"',
    '\\staff {score tabs}',
    barText.join(' |\n') + ' |',
  ].join('\n');
}
