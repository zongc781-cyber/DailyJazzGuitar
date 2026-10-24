// alphaTex output for alphaTab (https://alphatab.net). alphaTab draws standard notation and
// tab from this text and plays it back with its built-in synth, so notation, tab and audio all
// come from the same lesson JSON. Never hand-edit alphaTex; regenerate it from the lesson.

import { Frac, eventLength, barLength } from './rhythm.mjs';
import { STRING_NAMES, parseChord, parsePitch, parsePitchClass } from './theory.mjs';

const q = (s) => `"${String(s).replace(/(["\\])/g, '\\$1')}"`;

// alphaTex left-hand fingers: 1 = thumb, 2 = index, 3 = middle, 4 = ring, 5 = little.
export const toAlphaTexFinger = (finger) => (finger === 'T' ? 1 : finger + 1);

// alphaTab spells a fretted note from the key signature unless the note says otherwise, so every
// note states the accidental it is written with. G#3 and Ab3 then print as the lesson spells them.
const ACCIDENTAL_MODES = { '': 'forcenatural', '#': 'forcesharp', '##': 'forcedoublesharp', b: 'forceflat', bb: 'forcedoubleflat' };
export function toAlphaTexAccidental(pitch) {
  const p = parsePitch(pitch);
  return p ? ACCIDENTAL_MODES[p.acc] : null;
}

// Key signatures alphaTex understands, by tonic, with their position on the circle of fifths.
export const KEY_SIGNATURES = {
  major: { cb: -7, gb: -6, db: -5, ab: -4, eb: -3, bb: -2, f: -1, c: 0, g: 1, d: 2, a: 3, e: 4, b: 5, 'f#': 6, 'c#': 7 },
  minor: { ab: -7, eb: -6, bb: -5, f: -4, c: -3, g: -2, d: -1, a: 0, e: 1, b: 2, 'f#': 3, 'c#': 4, 'g#': 5, 'd#': 6, 'a#': 7 },
};

/** alphaTex key signature for a lesson key ({tonic:'Bb', mode:'major'} -> 'bbmajor'), or null. */
export function toAlphaTexKeySignature(key) {
  if (!key || !parsePitchClass(key.tonic)) return null;
  const mode = key.mode === 'minor' ? 'minor' : 'major';
  const tonic = key.tonic.toLowerCase();
  return tonic in KEY_SIGNATURES[mode] ? `${tonic}${mode}` : null;
}

// Display form of a degree label for the analysis overlay ("1" reads as R, flats and sharps as ♭ ♯).
export function degreeLabel(degree) {
  if (degree === '1') return 'R';
  return String(degree).replace(/bb/g, '𝄫').replace(/b/g, '♭').replace(/#/g, '♯');
}

/**
 * Convert bars + chords to alphaTex bar content. Throws if a chord change falls inside a
 * note, because alphaTab attaches chord names to beats.
 * options.labels = 'degrees' writes each note's degree above it (the analysis overlay).
 */
export function barsToAlphaTex(bars, chords, ts, { labels = null } = {}) {
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
  for (const bar of bars) {
    const parts = [];
    for (const ev of bar.events) {
      const key = t.toString();
      const beatFx = [];
      if (ev.dots === 1) beatFx.push('d');
      if (ev.dots === 2) beatFx.push('dd');
      if (ev.tuplet === 3) beatFx.push('tu 3');
      if (chordAt.has(key)) { beatFx.push(`ch ${q(chordAt.get(key))}`); used.add(key); }
      if (labels === 'degrees' && !ev.rest && !ev.tie && ev.degree !== undefined) beatFx.push(`txt ${q(degreeLabel(ev.degree))}`);
      let head;
      if (ev.rest) head = `r.${ev.dur}`;
      else {
        const noteFx = [];
        if (!ev.tie && ev.finger !== undefined && ev.fret > 0) noteFx.push(`lf ${toAlphaTexFinger(ev.finger)}`);
        if (!ev.tie) {
          const acc = toAlphaTexAccidental(ev.pitch);
          if (acc) noteFx.push(`acc ${acc}`);
        }
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
  }
  for (const k of chordAt.keys()) if (!used.has(k)) throw new Error(`chord ${chordAt.get(k)} starts in the middle of a note; split that note with a tie so the change has a beat`);
  return out;
}

// Standard tuning written out, high string first as alphaTex lists it.
const TUNING_TEXT = [1, 2, 3, 4, 5, 6].map((s) => STRING_NAMES[s]).join(' ');
export const GUITAR_PROGRAM = 26; // General MIDI "Electric Guitar (jazz)", 0-based

/**
 * Full alphaTex score for one melodic line: a lick, its variation or a guide-tone exercise.
 * line = {title?, bars, chords, timeSignature, feel, tempo (BPM), key?}
 */
export function lineToAlphaTex({ title, bars, chords, timeSignature: ts, feel, tempo, key }, { labels = null } = {}) {
  for (const c of chords ?? []) if (!parseChord(c.symbol)) throw new Error(`bad chord ${c.symbol}`);
  const body = barsToAlphaTex(bars, chords, ts, { labels });
  const swing = feel === 'swing';
  // Bar metadata is repeated on every bar so swing can never drift between bars.
  const barText = body.map((b) => `${swing ? '\\tf triplet8th ' : '\\tf none '}${b}`);
  const ks = toAlphaTexKeySignature(key);
  barText[0] = `\\ts ${ts[0]} ${ts[1]} ${ks ? `\\ks ${ks} ` : ''}${barText[0]}`;
  return [
    ...(title !== undefined ? [`\\title ${q(title)}`] : []),
    `\\tempo ${tempo}`,
    '.',
    '\\track "Guitar"',
    '\\staff {score tabs}',
    `\\tuning ${TUNING_TEXT}`,
    '\\instrument electricguitarjazz',
    barText.join(' |\n') + ' |',
  ].join('\n');
}

/** Full alphaTex score for a lick (or its variation when {variation:true}). */
export function lickToAlphaTex(lick, { variation = false, labels = null } = {}) {
  return lineToAlphaTex({
    title: lick.title + (variation ? ' (variation)' : ''),
    bars: variation ? lick.variation.bars : lick.bars,
    chords: variation ? (lick.variation.chords ?? lick.chords) : lick.chords,
    timeSignature: lick.timeSignature,
    feel: lick.feel,
    tempo: lick.tempo.default,
    key: lick.key,
  }, { labels });
}
