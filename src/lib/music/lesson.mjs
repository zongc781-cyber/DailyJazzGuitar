// Validation for daily licks and weekly standards.
// Every check reports {level, path, message}; a lesson is publishable only with zero errors.

import {
  STANDARD_TUNING, MAX_FRET, parsePitch, parsePitchClass, fretToMidi, parseChord, parseRoman,
  degreeSemitones, isChordTone, isTensionLabel, mod12,
} from './theory.mjs';
import { Frac, DURATIONS, eventLength, nominalLength, barLength, onsetToBeat } from './rhythm.mjs';

export const SCHEMA_VERSION = 1;
export const FEELS = ['swing', 'straight'];
export const ROLES = ['chord-tone', 'tension', 'approach-chromatic', 'approach-diatonic', 'enclosure', 'passing', 'neighbor', 'scale'];
const APPROACH_ROLES = new Set(['approach-chromatic', 'approach-diatonic', 'enclosure', 'passing', 'neighbor']);
const TARGET_ROLES = new Set(['chord-tone', 'tension']);
export const TOPICS = ['chord-tones', 'tensions', 'approach', 'rhythm', 'resolution'];
export const PLAN_FOCUSES = ['listening', 'harmony', 'comping', 'arpeggios', 'vocabulary', 'improvisation', 'self-review'];
const INSPIRATION_TYPES = ['transcription', 'in-the-style-of', 'original', 'method-exercise'];
const SOURCE_KINDS = ['recording', 'book', 'method', 'website', 'video', 'lead-sheet'];

export class Report {
  constructor(file = '') { this.file = file; this.items = []; }
  error(path, message) { this.items.push({ level: 'error', path, message }); }
  warn(path, message) { this.items.push({ level: 'warning', path, message }); }
  get errors() { return this.items.filter((i) => i.level === 'error'); }
  get warnings() { return this.items.filter((i) => i.level === 'warning'); }
  get ok() { return this.errors.length === 0; }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isInt = (v) => Number.isInteger(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v));

function onlyKeys(obj, allowed, path, r) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) r.error(`${path}.${k}`, `unknown field "${k}" (the lesson format is strict so typos and derived data do not slip in)`);
}

// ---------------- Provenance and content rules ----------------

function checkProvenance(l, r) {
  if (!['seed', 'generated'].includes(l.origin)) r.error('origin', 'origin must be "seed" or "generated"');
  if (l.origin === 'seed') {
    if (!isObj(l.review) || l.review.status !== 'reviewed' || !isStr(l.review.reviewedBy) || !isDate(l.review.reviewedOn))
      r.error('review', 'seed lessons need review {status:"reviewed", reviewedBy, reviewedOn:"YYYY-MM-DD"}');
    if (l.generator !== undefined) r.error('generator', 'seed lessons must not carry a generator block');
  }
  if (l.origin === 'generated') {
    const g = l.generator;
    if (!isObj(g) || !isStr(g.service) || !isStr(g.version) || !isDate(g.generatedAt))
      r.error('generator', 'generated lessons need generator {service, version, generatedAt}');
    if (l.inspiration?.type === 'transcription')
      r.error('inspiration.type', 'a generated lesson cannot claim to be a transcription of a recording');
  }
  if (typeof l.simplified !== 'boolean') r.error('simplified', 'simplified must be true or false, stated explicitly');
  if (l.simplified === true && !isStr(l.simplificationNote)) r.error('simplificationNote', 'say what was simplified');
  if (!Array.isArray(l.sources)) r.error('sources', 'sources must be an array');
  else {
    if (l.origin === 'seed' && l.sources.length === 0) r.error('sources', 'seed lessons must cite at least one source');
    l.sources.forEach((s, i) => {
      const p = `sources[${i}]`;
      if (!isObj(s) || !isStr(s.title) || !SOURCE_KINDS.includes(s.kind)) r.error(p, `each source needs a title and kind (${SOURCE_KINDS.join('|')})`);
      else onlyKeys(s, ['title', 'author', 'kind', 'url', 'year', 'detail'], p, r);
      if (s?.url !== undefined && !/^https:\/\//.test(s.url)) r.error(`${p}.url`, 'source URLs must be https');
    });
  }
}

function checkInspiration(l, r) {
  const ins = l.inspiration;
  if (!isObj(ins) || !INSPIRATION_TYPES.includes(ins.type)) {
    r.error('inspiration', `inspiration.type must be one of ${INSPIRATION_TYPES.join('|')}`);
    return;
  }
  onlyKeys(ins, ['type', 'artist', 'recording', 'year', 'at', 'note'], 'inspiration', r);
  if (['transcription', 'in-the-style-of'].includes(ins.type) && !isStr(ins.artist))
    r.error('inspiration.artist', `${ins.type} needs the artist`);
  if (ins.type === 'transcription') {
    if (!isStr(ins.recording)) r.error('inspiration.recording', 'a transcription must name the recording');
    if (!l.sources?.some?.((s) => s.kind === 'recording')) r.error('sources', 'a transcription must cite the recording as a source');
  }
}

// Absolute note names and chord symbols break transposition: prose must use tokens instead.
const RAW_MUSIC = [
  /\b[A-G](?:#|b|♯|♭)(?![a-z])/, // Bb, F#
  /\b[A-G](?:maj|min|m7|m9|m6|dim|aug|ø|°|Δ|7|9|11|13|6)/, // Cmaj7, G7, Am7
  /\b[A-G]-?\d\b/, // C4, E2
  /\b(?:on|to|from|of|an?|the|onto|up to|down to)\s+[A-G]\b(?!\s+string)/, // "resolves to G"
];
const TOKEN = /\{\{\s*(note|chord|key)\s*([^}]*)\}\}/g;

export function checkProse(text, path, ctx, r) {
  if (text === undefined) return;
  if (!isStr(text)) { r.error(path, 'expected non-empty text'); return; }
  const stripped = text.replace(TOKEN, ' ');
  for (const re of RAW_MUSIC) {
    const m = re.exec(stripped);
    if (m) { r.error(path, `raw note or chord name "${m[0].trim()}" in prose; use {{note b.i}}, {{chord n}} or {{key}} so transposition updates it`); break; }
  }
  for (const m of text.matchAll(TOKEN)) {
    const [, kind, arg] = m;
    if (kind === 'key') continue;
    if (kind === 'chord') {
      const n = Number(arg.trim());
      if (!isInt(n) || n < 1 || n > (ctx.chords?.length ?? 0)) r.error(path, `{{chord ${arg.trim()}}} does not match a chord (1..${ctx.chords?.length ?? 0})`);
    } else {
      const [b, i] = arg.trim().split('.').map(Number);
      if (!ctx.noteAt?.(b, i)) r.error(path, `{{note ${arg.trim()}}} does not point at a note (bar.event, 1-based)`);
    }
  }
}

function checkKey(key, path, r) {
  if (!isObj(key) || !parsePitchClass(key.tonic) || !['major', 'minor'].includes(key.mode)) {
    r.error(path, 'key must be {tonic:"Bb", mode:"major"|"minor"}');
    return false;
  }
  return true;
}

function checkTimeSignature(ts, r) {
  if (!Array.isArray(ts) || ts.length !== 2 || !isInt(ts[0]) || ts[0] < 1 || ![2, 4, 8].includes(ts[1])) {
    r.error('timeSignature', 'timeSignature must be [beats, 2|4|8]');
    return false;
  }
  return true;
}

function checkTempo(t, r) {
  if (!isObj(t) || !isInt(t.default) || !isInt(t.min) || !isInt(t.max) || t.min < 30 || t.max > 360 || !(t.min <= t.default && t.default <= t.max))
    r.error('tempo', 'tempo must be {min, default, max} integers with 30 <= min <= default <= max <= 360');
}

// ---------------- Chords on a timeline ----------------

/** Parse and place chords; returns [{symbol, chord, pos(Frac from start)}] sorted. */
function placeChords(chords, ts, nBars, path, r) {
  const out = [];
  if (!Array.isArray(chords) || chords.length === 0) { r.error(path, 'at least one chord is required'); return out; }
  const bl = barLength(ts);
  chords.forEach((c, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(c)) { r.error(p, 'chord must be an object'); return; }
    onlyKeys(c, ['symbol', 'bar', 'beat', 'roman', 'keyCenter'], p, r);
    const chord = parseChord(c.symbol);
    if (!chord) r.error(`${p}.symbol`, `unrecognised chord symbol "${c.symbol}"`);
    if (!isInt(c.bar) || c.bar < 1 || c.bar > nBars) r.error(`${p}.bar`, `bar must be 1..${nBars}`);
    if (typeof c.beat !== 'number' || c.beat < 1 || c.beat >= ts[0] + 1 || (c.beat * 2) % 1 !== 0)
      r.error(`${p}.beat`, `beat must be 1..${ts[0]} (halves allowed)`);
    if (!chord || !isInt(c.bar)) return;
    const pos = bl.mul(new Frac(c.bar - 1)).add(new Frac(Math.round((c.beat - 1) * 2), 2 * ts[1]));
    out.push({ ...c, chord, pos, index: i + 1 });
  });
  for (let i = 1; i < out.length; i++) if (out[i].pos.cmp(out[i - 1].pos) <= 0) r.error(`${path}[${i}]`, 'chords must be in time order with no duplicates');
  if (out.length && !out[0].pos.eq(new Frac(0))) r.error(`${path}[0]`, 'the first chord must start on bar 1 beat 1');
  return out;
}

function chordAt(placed, pos) {
  let cur = null;
  for (const c of placed) if (c.pos.cmp(pos) <= 0) cur = c;
  return cur;
}

// ---------------- Melodic lines (lick, variation, guide-tone exercises) ----------------

const EVENT_KEYS = ['dur', 'dots', 'tuplet', 'rest', 'string', 'fret', 'pitch', 'finger', 'degree', 'role', 'tie', 'technique', 'shift'];

/**
 * Validate bars of single-note events against chords and the time signature.
 * Returns {attacks, noteAt(b,i)} for analysis cross-checks.
 */
export function checkLine({ bars, chords, ts }, path, r) {
  const notes = []; // every note event incl. ties, in time order
  const noteMap = new Map();
  if (!Array.isArray(bars) || bars.length === 0) { r.error(`${path}.bars`, 'bars must be a non-empty array'); return { attacks: [], noteAt: () => null }; }
  const placed = placeChords(chords, ts, bars.length, `${path}.chords`, r);
  const bl = barLength(ts);

  bars.forEach((bar, bi) => {
    const bp = `${path}.bars[${bi}]`;
    if (!isObj(bar) || !Array.isArray(bar.events) || bar.events.length === 0) { r.error(bp, 'each bar needs a non-empty events array'); return; }
    onlyKeys(bar, ['events'], bp, r);
    let t = new Frac(0);
    let tupletRun = null; // {sum, min}
    const closeTuplet = (ep) => {
      if (!tupletRun) return;
      const unit = tupletRun.min.mul(new Frac(2));
      if (!tupletRun.sum.div(unit).isInt()) r.error(ep, `incomplete triplet group (${tupletRun.sum} of a whole note)`);
      tupletRun = null;
    };
    bar.events.forEach((ev, ei) => {
      const ep = `${bp}.events[${ei}]`;
      if (!isObj(ev)) { r.error(ep, 'event must be an object'); return; }
      onlyKeys(ev, EVENT_KEYS, ep, r);
      if (!DURATIONS.includes(ev.dur)) { r.error(`${ep}.dur`, `dur must be one of ${DURATIONS.join(',')} (as a string)`); return; }
      if (ev.dots !== undefined && ![1, 2].includes(ev.dots)) r.error(`${ep}.dots`, 'dots must be 1 or 2');
      if (ev.tuplet !== undefined && ev.tuplet !== 3) r.error(`${ep}.tuplet`, 'only triplets (3) are supported');
      if (ev.tuplet === 3) {
        tupletRun ??= { sum: new Frac(0), min: nominalLength(ev) };
        tupletRun.sum = tupletRun.sum.add(eventLength(ev));
        if (nominalLength(ev).cmp(tupletRun.min) < 0) tupletRun.min = nominalLength(ev);
        const unit = tupletRun.min.mul(new Frac(2));
        if (tupletRun.sum.div(unit).isInt()) tupletRun = null; // group complete
      } else closeTuplet(ep);

      const onset = t;
      t = t.add(eventLength(ev));
      if (ev.rest) {
        for (const k of ['string', 'fret', 'pitch', 'finger', 'degree', 'role', 'tie', 'technique']) if (ev[k] !== undefined) r.error(`${ep}.${k}`, 'rests carry no note fields');
        return;
      }
      const absPos = bl.mul(new Frac(bi)).add(onset);
      const note = checkNote(ev, ep, r);
      const cur = chordAt(placed, absPos);
      const n = { ...note, ev, path: ep, bar: bi + 1, idx: ei + 1, onset, absPos, chord: cur };
      if (note.midi !== null && cur && !ev.tie) checkDegree(n, r);
      notes.push(n);
      noteMap.set(`${bi + 1}.${ei + 1}`, n);
    });
    if (tupletRun) r.error(bp, 'bar ends inside an incomplete triplet group');
    if (!t.eq(bl)) r.error(bp, `rhythm adds up to ${t} of a whole note but ${ts[0]}/${ts[1]} needs ${bl}`);
  });

  // Ties continue the previous note.
  notes.forEach((n, i) => {
    if (!n.ev.tie) return;
    const prev = notes[i - 1];
    if (!prev || prev.midi !== n.midi || prev.ev.string !== n.ev.string) r.error(n.path, 'tie must continue the previous note on the same string and pitch');
  });
  const attacks = notes.filter((n) => !n.ev.tie);
  checkRoles(attacks, r);
  checkPlayability(attacks, r);
  return { attacks, notes, placed, noteAt: (b, i) => noteMap.get(`${b}.${i}`) ?? null };
}

function checkNote(ev, ep, r) {
  const out = { midi: null };
  if (!isInt(ev.string) || !(ev.string in STANDARD_TUNING)) { r.error(`${ep}.string`, 'string must be 1 (high E) .. 6 (low E)'); return out; }
  if (!isInt(ev.fret) || ev.fret < 0 || ev.fret > MAX_FRET) { r.error(`${ep}.fret`, `fret must be 0..${MAX_FRET}`); return out; }
  const midi = fretToMidi(ev.string, ev.fret);
  const p = parsePitch(ev.pitch);
  if (!p) r.error(`${ep}.pitch`, `pitch must be sounding scientific pitch like "Bb3" (got ${JSON.stringify(ev.pitch)})`);
  else if (p.midi !== midi) r.error(`${ep}.pitch`, `string ${ev.string} fret ${ev.fret} sounds MIDI ${midi}, but pitch ${ev.pitch} is MIDI ${p.midi}`);
  if (ev.fret === 0 && ev.finger !== 0) r.error(`${ep}.finger`, 'open strings take finger 0');
  if (ev.fret > 0 && ![1, 2, 3, 4, 'T'].includes(ev.finger)) r.error(`${ep}.finger`, 'fretted notes take finger 1-4 (or "T" for thumb)');
  if (ev.finger === 'T' && ev.string !== 6) r.error(`${ep}.finger`, 'thumb is only allowed on string 6');
  if (ev.technique !== undefined && !['h', 'p', 'sl'].includes(ev.technique)) r.error(`${ep}.technique`, 'technique must be h, p or sl');
  if (!ev.tie) {
    if (degreeSemitones(ev.degree) === null) r.error(`${ep}.degree`, `unknown degree "${ev.degree}"`);
    if (!ROLES.includes(ev.role)) r.error(`${ep}.role`, `role must be one of ${ROLES.join(', ')}`);
  }
  out.midi = midi;
  return out;
}

function checkDegree(n, r) {
  const semis = degreeSemitones(n.ev.degree);
  if (semis === null) return;
  const actual = mod12(n.midi - n.chord.chord.rootPc);
  if (actual !== mod12(semis))
    r.error(`${n.path}.degree`, `${n.ev.pitch} over ${n.chord.symbol} is ${actual} semitones above the root, not degree ${n.ev.degree}`);
}

function checkRoles(attacks, r) {
  attacks.forEach((n, i) => {
    const { role, degree } = n.ev;
    const semis = degreeSemitones(degree);
    if (!n.chord || semis === null || n.midi === null) return;
    const prev = attacks[i - 1];
    const next = attacks[i + 1];
    const ch = n.chord.chord;
    const where = `${n.path}.role`;
    switch (role) {
      case 'chord-tone':
        if (!isChordTone(ch, semis)) r.error(where, `degree ${degree} is not a chord tone of ${n.chord.symbol}`);
        break;
      case 'tension':
        if (!isTensionLabel(degree) || isChordTone(ch, semis)) r.error(where, `tension must be 9/11/13 or an altered 9/11/13 that is not already a chord tone (got ${degree} over ${n.chord.symbol})`);
        else if (degree === '11' && ch.tones.includes(4)) r.warn(where, `natural 11 over ${n.chord.symbol} clashes with the major 3rd; explain it or use #11`);
        else if (degree === 'b9' && ch.family !== 'dom') r.warn(where, `b9 over ${n.chord.symbol} is unusual outside dominant chords`);
        break;
      case 'approach-chromatic':
      case 'approach-diatonic': {
        const max = role === 'approach-chromatic' ? 1 : 2;
        if (!next) r.error(where, 'an approach note needs a following target');
        else if (Math.abs(next.midi - n.midi) > max || next.midi === n.midi) r.error(where, `${role} must move ${max === 1 ? 'a half step' : 'a half or whole step'} into the next note`);
        else if (!TARGET_ROLES.has(next.ev.role)) r.error(where, 'the note after an approach must be a chord tone or tension');
        break;
      }
      case 'enclosure': {
        let j = i;
        while (attacks[j] && attacks[j].ev.role === 'enclosure') j++;
        const target = attacks[j];
        if (!target || !TARGET_ROLES.has(target.ev.role)) { r.error(where, 'an enclosure must lead to a chord tone or tension'); break; }
        if (Math.abs(target.midi - n.midi) > 3 || target.midi === n.midi) r.error(where, 'enclosure notes sit within a minor 3rd above or below the target');
        if (prev?.ev.role !== 'enclosure') {
          const group = attacks.slice(i, j);
          if (!group.some((g) => g.midi > target.midi) || !group.some((g) => g.midi < target.midi)) r.error(where, 'an enclosure surrounds its target from above and below');
        }
        break;
      }
      case 'passing':
        if (!prev || !next) r.error(where, 'a passing note needs notes on both sides');
        else {
          const a = n.midi - prev.midi, b = next.midi - n.midi;
          if (!(Math.abs(a) >= 1 && Math.abs(a) <= 2 && Math.abs(b) >= 1 && Math.abs(b) <= 2 && Math.sign(a) === Math.sign(b))) r.error(where, 'a passing note moves by step in one direction between two notes');
        }
        break;
      case 'neighbor':
        if (!prev || !next || prev.midi !== next.midi || Math.abs(n.midi - prev.midi) > 2 || n.midi === prev.midi) r.error(where, 'a neighbour note steps away from and back to the same pitch');
        break;
      default:
        break;
    }
  });
}

/**
 * Fingering model: between shifts the hand sits in one position. Each fretted note implies
 * position = fret - finger. Positions within a segment may differ by at most 1 (a stretch).
 */
function checkPlayability(attacks, r) {
  let seg = [];
  const flush = () => {
    const fretted = seg.filter((n) => n.ev.fret > 0 && isInt(n.ev.finger));
    if (fretted.length) {
      const frets = fretted.map((n) => n.ev.fret);
      const span = Math.max(...frets) - Math.min(...frets);
      const pos = fretted.map((n) => n.ev.fret - n.ev.finger);
      const last = fretted[fretted.length - 1].path;
      if (span > 5) r.error(last, `fret span of ${span} without a shift is not playable; mark a shift or slide`);
      else if (span === 5) r.warn(last, 'a 5-fret stretch; fine for some hands, mention it in the fingering note');
      if (Math.max(...pos) - Math.min(...pos) > 1) r.error(last, `fingers imply hand positions ${[...new Set(pos)].join(', ')} without a shift; fix fingers or mark "shift": true`);
    }
    seg = [];
  };
  attacks.forEach((n, i) => {
    if (n.midi === null) return;
    const prev = attacks[i - 1];
    if (n.ev.shift || n.ev.technique === 'sl') flush();
    if (['h', 'p', 'sl'].includes(n.ev.technique)) {
      if (!prev || prev.ev.string !== n.ev.string) r.error(`${n.path}.technique`, 'hammer-ons, pull-offs and slides stay on the same string as the previous note');
      else if (n.ev.technique === 'h' && n.ev.fret <= prev.ev.fret) r.error(`${n.path}.technique`, 'a hammer-on goes up the string');
      else if (n.ev.technique === 'p' && n.ev.fret >= prev.ev.fret) r.error(`${n.path}.technique`, 'a pull-off goes down the string');
    }
    if (prev && !n.ev.shift && n.ev.technique !== 'sl' && isInt(n.ev.finger) && n.ev.finger > 0 && n.ev.finger === prev.ev.finger) {
      if (n.ev.fret !== prev.ev.fret) r.error(`${n.path}.finger`, `finger ${n.ev.finger} jumps from fret ${prev.ev.fret} to ${n.ev.fret}; use a slide or another finger`);
      else if (Math.abs(n.ev.string - prev.ev.string) > 1) r.warn(`${n.path}.finger`, 'same finger and fret across non-adjacent strings (a barre); check it is intended');
    }
    seg.push(n);
  });
  flush();
}

// ---------------- Daily lick ----------------

const LICK_KEYS = ['schemaVersion', 'kind', 'id', 'title', 'origin', 'review', 'generator', 'standardId', 'inspiration', 'sources', 'simplified', 'simplificationNote', 'key', 'timeSignature', 'feel', 'tempo', 'chords', 'bars', 'analysis', 'whyItWorks', 'practiceTask', 'variation', 'difficulty', 'tags', 'fingeringNote'];

export function validateLick(l, r = new Report()) {
  if (!isObj(l)) { r.error('', 'lesson must be an object'); return r; }
  onlyKeys(l, LICK_KEYS, '', r);
  if (l.schemaVersion !== SCHEMA_VERSION) r.error('schemaVersion', `schemaVersion must be ${SCHEMA_VERSION}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(l.id ?? '')) r.error('id', 'id must be a lowercase slug');
  if (!isStr(l.title)) r.error('title', 'title is required');
  if (l.standardId !== undefined && !/^[a-z0-9-]+$/.test(l.standardId)) r.error('standardId', 'standardId must be a slug');
  if (l.difficulty !== undefined && !(isInt(l.difficulty) && l.difficulty >= 1 && l.difficulty <= 5)) r.error('difficulty', 'difficulty is 1..5');
  checkProvenance(l, r);
  checkInspiration(l, r);
  checkKey(l.key, 'key', r);
  if (!FEELS.includes(l.feel)) r.error('feel', 'feel must be "swing" or "straight"; swing ratio is never set per lesson');
  checkTempo(l.tempo, r);
  if (!checkTimeSignature(l.timeSignature, r)) return r;
  if (Array.isArray(l.bars) && (l.bars.length < 2 || l.bars.length > 4)) r.error('bars', 'a daily lick is 2 to 4 bars');

  const line = checkLine({ bars: l.bars, chords: l.chords, ts: l.timeSignature }, '', r);
  checkAnalysis(l, line, r);

  const ctx = { chords: l.chords, noteAt: line.noteAt };
  checkProse(l.whyItWorks, 'whyItWorks', ctx, r);
  if (isStr(l.whyItWorks) && l.whyItWorks.length > 700) r.warn('whyItWorks', 'keep "Why this works" brief (under ~700 characters)');
  checkProse(l.practiceTask, 'practiceTask', ctx, r);
  checkProse(l.fingeringNote, 'fingeringNote', ctx, r);

  const v = l.variation;
  if (!isObj(v)) r.error('variation', 'one variation is required');
  else {
    onlyKeys(v, ['description', 'chords', 'bars'], 'variation', r);
    if (Array.isArray(v.bars) && (v.bars.length < 1 || v.bars.length > 4)) r.error('variation.bars', 'a variation is 1 to 4 bars');
    const vChords = v.chords ?? l.chords;
    const vl = checkLine({ bars: v.bars, chords: vChords, ts: l.timeSignature }, 'variation', r);
    checkProse(v.description, 'variation.description', { chords: vChords, noteAt: vl.noteAt }, r);
    if (!isStr(v.description)) r.error('variation.description', 'describe what the variation changes');
  }
  return r;
}

function checkAnalysis(l, line, r) {
  const a = l.analysis;
  if (!isObj(a)) { r.error('analysis', 'analysis is required'); return; }
  onlyKeys(a, ['summary', 'points', 'resolution'], 'analysis', r);
  const ctx = { chords: l.chords, noteAt: line.noteAt };
  checkProse(a.summary, 'analysis.summary', ctx, r);
  if (!isStr(a.summary)) r.error('analysis.summary', 'summary is required');
  const ts = l.timeSignature;
  const topicsSeen = new Set();
  (Array.isArray(a.points) ? a.points : []).forEach((pt, i) => {
    const p = `analysis.points[${i}]`;
    if (!isObj(pt)) { r.error(p, 'point must be an object'); return; }
    onlyKeys(pt, ['topic', 'notes', 'text', 'onsetBeats'], p, r);
    if (!TOPICS.includes(pt.topic)) r.error(`${p}.topic`, `topic must be one of ${TOPICS.join(', ')}`);
    topicsSeen.add(pt.topic);
    checkProse(pt.text, `${p}.text`, ctx, r);
    const refs = Array.isArray(pt.notes) ? pt.notes : [];
    if (refs.length === 0) r.error(`${p}.notes`, 'point at the notes this explains, as [[bar, event], ...]');
    refs.forEach((ref, k) => {
      const n = Array.isArray(ref) ? line.noteAt(ref[0], ref[1]) : null;
      if (!n) { r.error(`${p}.notes[${k}]`, `no note at ${JSON.stringify(ref)}`); return; }
      const role = n.ev.role;
      if (pt.topic === 'chord-tones' && role !== 'chord-tone') r.error(`${p}.notes[${k}]`, `called a chord tone, but the note's role is ${role}`);
      if (pt.topic === 'tensions' && role !== 'tension') r.error(`${p}.notes[${k}]`, `called a tension, but the note's role is ${role}`);
      if (pt.topic === 'approach' && !APPROACH_ROLES.has(role)) r.error(`${p}.notes[${k}]`, `called an approach note, but the note's role is ${role}`);
      if (pt.topic === 'resolution' && !TARGET_ROLES.has(role)) r.error(`${p}.notes[${k}]`, 'a resolution lands on a chord tone or tension');
      if (pt.onsetBeats !== undefined) {
        const claimed = pt.onsetBeats[k];
        const actual = onsetToBeat(n.onset, ts);
        if (typeof claimed !== 'number' || Math.abs(claimed - actual) > 1e-6) r.error(`${p}.onsetBeats[${k}]`, `note starts on beat ${+actual.toFixed(3)} of bar ${n.bar}, not ${claimed}`);
      }
    });
    if (pt.onsetBeats !== undefined && (!Array.isArray(pt.onsetBeats) || pt.onsetBeats.length !== refs.length)) r.error(`${p}.onsetBeats`, 'onsetBeats needs one beat per referenced note');
  });
  for (const t of ['chord-tones', 'approach', 'rhythm', 'resolution']) if (!topicsSeen.has(t)) r.error('analysis.points', `analysis must cover "${t}"`);
  if (line.attacks.some((n) => n.ev.role === 'tension') && !topicsSeen.has('tensions')) r.error('analysis.points', 'the lick uses tensions, so the analysis must cover "tensions"');
  if (line.attacks.some((n) => n.ev.role === 'tension') === false && topicsSeen.has('tensions')) r.error('analysis.points', 'analysis talks about tensions but no note has role "tension"');

  const res = a.resolution;
  if (!isObj(res)) { r.error('analysis.resolution', 'resolution {note:[bar,event], degree, onsetBeat} is required'); return; }
  onlyKeys(res, ['note', 'degree', 'onsetBeat'], 'analysis.resolution', r);
  const n = Array.isArray(res.note) ? line.noteAt(res.note[0], res.note[1]) : null;
  if (!n) r.error('analysis.resolution.note', 'resolution must point at a note');
  else {
    if (res.degree !== n.ev.degree) r.error('analysis.resolution.degree', `the resolution note is degree ${n.ev.degree}, not ${res.degree}`);
    const actual = onsetToBeat(n.onset, ts);
    if (res.onsetBeat !== undefined && Math.abs(res.onsetBeat - actual) > 1e-6) r.error('analysis.resolution.onsetBeat', `the resolution note starts on beat ${actual}, not ${res.onsetBeat}`);
  }
}

// ---------------- Weekly standard ----------------

const STANDARD_KEYS = ['schemaVersion', 'kind', 'id', 'title', 'composers', 'year', 'origin', 'review', 'generator', 'sources', 'simplified', 'simplificationNote', 'key', 'keyCenters', 'timeSignature', 'feel', 'tempo', 'form', 'chart', 'listening', 'analysis', 'voicings', 'guideToneExercises', 'improvisation', 'practicePlan', 'lickIds', 'tags'];

export function validateStandard(s, r = new Report()) {
  if (!isObj(s)) { r.error('', 'lesson must be an object'); return r; }
  onlyKeys(s, STANDARD_KEYS, '', r);
  if (s.schemaVersion !== SCHEMA_VERSION) r.error('schemaVersion', `schemaVersion must be ${SCHEMA_VERSION}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s.id ?? '')) r.error('id', 'id must be a lowercase slug');
  if (!isStr(s.title)) r.error('title', 'title is required');
  if (!Array.isArray(s.composers) || s.composers.length === 0 || !s.composers.every(isStr)) r.error('composers', 'list the composer(s)');
  if (!isInt(s.year)) r.error('year', 'year of composition is required');
  checkProvenance(s, r);
  checkKey(s.key, 'key', r);
  if (!FEELS.includes(s.feel)) r.error('feel', 'feel must be "swing" or "straight"');
  checkTempo(s.tempo, r);
  if (!checkTimeSignature(s.timeSignature, r)) return r;
  const ts = s.timeSignature;

  // Form and chart
  const f = s.form;
  let nBars = 0;
  if (!isObj(f) || !isStr(f.label) || !Array.isArray(f.sections) || f.sections.length === 0) r.error('form', 'form needs {label:"AABA", sections:[{label, bars}]}');
  else {
    f.sections.forEach((sec, i) => { if (!isStr(sec?.label) || !isInt(sec?.bars) || sec.bars < 1) r.error(`form.sections[${i}]`, 'section needs label and bars'); else nBars += sec.bars; });
    if (f.bars !== undefined && f.bars !== nBars) r.error('form.bars', `sections add up to ${nBars} bars, form says ${f.bars}`);
  }
  if (!Array.isArray(s.chart) || s.chart.length !== nBars) r.error('chart', `chart must have one entry per bar of the form (${nBars})`);

  // Key centres cover every bar
  const centers = Array.isArray(s.keyCenters) ? s.keyCenters : [];
  if (centers.length === 0) r.error('keyCenters', 'list the key centres');
  const centerOfBar = (b) => centers.find((c) => Array.isArray(c.bars) && b >= c.bars[0] && b <= c.bars[1]);
  centers.forEach((c, i) => {
    if (!isObj(c) || !parsePitchClass(c.tonic) || !['major', 'minor'].includes(c.mode) || !Array.isArray(c.bars) || c.bars.length !== 2) r.error(`keyCenters[${i}]`, 'key centre needs {tonic, mode, bars:[first,last]}');
  });
  for (let b = 1; b <= nBars; b++) if (!centerOfBar(b)) { r.error('keyCenters', `bar ${b} has no key centre`); break; }

  // Chart chords with roman numerals
  const flatChords = [];
  (Array.isArray(s.chart) ? s.chart : []).forEach((bar, bi) => {
    const bp = `chart[${bi}]`;
    if (!isObj(bar) || !Array.isArray(bar.chords) || bar.chords.length === 0) { r.error(bp, 'each bar lists its chords'); return; }
    onlyKeys(bar, ['chords'], bp, r);
    bar.chords.forEach((c) => flatChords.push({ ...c, bar: bi + 1 }));
  });
  placeChords(flatChords, ts, nBars, 'chart', r);
  checkRomans(flatChords, centerOfBar, 'chart', r);

  // Listening links
  const L = s.listening;
  if (!Array.isArray(L) || L.length < 2) r.error('listening', 'give at least two listening links');
  else L.forEach((x, i) => {
    const p = `listening[${i}]`;
    if (!isObj(x) || !isStr(x.performer) || !isStr(x.recording) || !isInt(x.year)) r.error(p, 'listening entry needs performer, recording, year');
    if (!/^https:\/\//.test(x?.url ?? '')) r.error(`${p}.url`, 'listening URL must be https');
    if (!isDate(x?.verifiedOn)) r.error(`${p}.verifiedOn`, 'a person must open the link and record verifiedOn (YYYY-MM-DD)');
    if (isObj(x)) onlyKeys(x, ['performer', 'recording', 'album', 'year', 'url', 'verifiedOn', 'note'], p, r);
  });

  // Analysis and progression variations
  const a = s.analysis;
  const chartCtx = { chords: flatChords, noteAt: () => null };
  if (!isObj(a) || !isStr(a.summary)) r.error('analysis.summary', 'harmonic analysis summary is required');
  else {
    onlyKeys(a, ['summary', 'sections', 'variations'], 'analysis', r);
    checkProse(a.summary, 'analysis.summary', chartCtx, r);
    (a.sections ?? []).forEach((sec, i) => checkProse(sec?.text, `analysis.sections[${i}].text`, chartCtx, r));
    if (!Array.isArray(a.variations) || a.variations.length === 0) r.error('analysis.variations', 'explain at least one common progression variation');
    else a.variations.forEach((v, i) => {
      const p = `analysis.variations[${i}]`;
      if (!isObj(v) || !isStr(v.name) || !Array.isArray(v.chords) || v.chords.length === 0) { r.error(p, 'variation needs name and chords [{bar, beat, symbol, roman}]'); return; }
      v.chords.forEach((c, k) => { if (!parseChord(c.symbol)) r.error(`${p}.chords[${k}]`, `unrecognised chord symbol "${c.symbol}"`); if (!isInt(c.bar) || c.bar < 1 || c.bar > nBars) r.error(`${p}.chords[${k}].bar`, `bar must be 1..${nBars}`); });
      checkRomans(v.chords, centerOfBar, `${p}.chords`, r);
      checkProse(v.text, `${p}.text`, { chords: v.chords, noteAt: () => null }, r);
    });
  }

  // Voicings
  if (!Array.isArray(s.voicings) || s.voicings.length === 0) r.error('voicings', 'give guitar voicings for the main chords');
  else s.voicings.forEach((v, i) => checkVoicing(v, `voicings[${i}]`, r));

  // Guide-tone exercises are melodic lines like licks
  if (!Array.isArray(s.guideToneExercises) || s.guideToneExercises.length === 0) r.error('guideToneExercises', 'at least one guide-tone exercise is required');
  else s.guideToneExercises.forEach((g, i) => {
    const p = `guideToneExercises[${i}]`;
    if (!isObj(g) || !isStr(g.title)) { r.error(p, 'exercise needs a title'); return; }
    onlyKeys(g, ['title', 'description', 'chords', 'bars'], p, r);
    const line = checkLine({ bars: g.bars, chords: g.chords, ts }, p, r);
    checkProse(g.description, `${p}.description`, { chords: g.chords, noteAt: line.noteAt }, r);
  });

  if (!Array.isArray(s.improvisation) || s.improvisation.length === 0) r.error('improvisation', 'give improvisation suggestions');
  else s.improvisation.forEach((x, i) => { if (!isStr(x?.title)) r.error(`improvisation[${i}]`, 'suggestion needs a title'); checkProse(x?.text, `improvisation[${i}].text`, chartCtx, r); });

  // Seven-day plan
  const plan = s.practicePlan;
  if (!Array.isArray(plan) || plan.length !== 7) r.error('practicePlan', 'the practice plan has exactly 7 days');
  else {
    plan.forEach((d, i) => {
      const p = `practicePlan[${i}]`;
      if (!isObj(d) || d.day !== i + 1) r.error(p, `day must be ${i + 1}`);
      if (!PLAN_FOCUSES.includes(d?.focus)) r.error(`${p}.focus`, `focus must be one of ${PLAN_FOCUSES.join(', ')}`);
      if (!isInt(d?.minutes) || d.minutes < 5 || d.minutes > 120) r.error(`${p}.minutes`, 'minutes must be 5..120');
      if (!Array.isArray(d?.tasks) || d.tasks.length === 0) r.error(`${p}.tasks`, 'list the tasks');
      else d.tasks.forEach((t, k) => checkProse(t, `${p}.tasks[${k}]`, chartCtx, r));
      if (isObj(d)) onlyKeys(d, ['day', 'focus', 'minutes', 'tasks', 'lickId'], p, r);
    });
    const missing = PLAN_FOCUSES.filter((x) => !plan.some((d) => d?.focus === x));
    if (missing.length) r.error('practicePlan', `the plan must cover every focus once; missing ${missing.join(', ')}`);
  }
  if (s.lickIds !== undefined && (!Array.isArray(s.lickIds) || !s.lickIds.every((x) => /^[a-z0-9-]+$/.test(x)))) r.error('lickIds', 'lickIds must be slugs');
  return r;
}

function checkRomans(chords, centerOfBar, path, r) {
  chords.forEach((c, i) => {
    const chord = parseChord(c.symbol);
    if (!chord) return;
    if (!isStr(c.roman)) { r.error(`${path}[${i}].roman`, `give a roman numeral for ${c.symbol}`); return; }
    const center = c.keyCenter ? { tonic: c.keyCenter } : centerOfBar(c.bar);
    if (!center) return;
    const rn = parseRoman(c.roman, center.tonic);
    if (!rn) { r.error(`${path}[${i}].roman`, `cannot read roman numeral "${c.roman}"`); return; }
    if (rn.rootPc !== chord.rootPc) r.error(`${path}[${i}].roman`, `${c.roman} in ${center.tonic} does not have root ${chord.root} (${c.symbol})`);
    else if (rn.family !== chord.family) r.error(`${path}[${i}].roman`, `${c.roman} implies a ${rn.family} chord but ${c.symbol} is ${chord.family}`);
  });
}

export function checkVoicing(v, p, r) {
  if (!isObj(v) || !parseChord(v.symbol) || !Array.isArray(v.notes) || v.notes.length < 3) { r.error(p, 'voicing needs symbol and at least 3 notes'); return; }
  onlyKeys(v, ['symbol', 'name', 'notes', 'note'], p, r);
  const chord = parseChord(v.symbol);
  const strings = new Set();
  const degrees = [];
  v.notes.forEach((n, i) => {
    const np = `${p}.notes[${i}]`;
    onlyKeys(n, ['string', 'fret', 'finger', 'pitch', 'degree'], np, r);
    if (strings.has(n.string)) r.error(np, 'one note per string');
    strings.add(n.string);
    const { midi } = checkNote({ ...n, role: 'chord-tone' }, np, r);
    if (midi === null) return;
    const semis = degreeSemitones(n.degree);
    if (semis !== null && mod12(midi - chord.rootPc) !== mod12(semis)) r.error(`${np}.degree`, `${n.pitch} is not degree ${n.degree} of ${v.symbol}`);
    if (semis !== null && !isChordTone(chord, semis) && !chord.tensions.some((t) => mod12(t) === semis) && !isTensionLabel(n.degree)) r.error(`${np}.degree`, `degree ${n.degree} does not belong in ${v.symbol}`);
    degrees.push(semis);
  });
  const fretted = v.notes.filter((n) => n.fret > 0).map((n) => n.fret);
  if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 4) r.error(p, 'voicing spans more than 4 frets');
  const third = chord.tones.find((t) => [3, 4, 5].includes(t));
  const seventh = chord.tones.find((t) => [9, 10, 11].includes(t) && t !== 9) ?? chord.tones.find((t) => t === 9);
  if (third !== undefined && !degrees.includes(third)) r.warn(p, 'voicing has no 3rd (or sus 4); is that intended?');
  if (seventh !== undefined && !degrees.includes(seventh)) r.warn(p, 'voicing has no 7th/6th guide tone');
  const byFinger = new Map();
  v.notes.filter((n) => n.fret > 0).forEach((n) => {
    const f = byFinger.get(n.finger);
    if (f !== undefined && f !== n.fret) r.error(p, `finger ${n.finger} cannot hold frets ${f} and ${n.fret}`);
    byFinger.set(n.finger, n.fret);
  });
}

export function validateLesson(lesson, file = '') {
  const r = new Report(file);
  if (lesson?.kind === 'lick') return validateLick(lesson, r);
  if (lesson?.kind === 'standard') return validateStandard(lesson, r);
  r.error('kind', 'kind must be "lick" or "standard"');
  return r;
}
