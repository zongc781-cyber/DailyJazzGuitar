// Transposition: one function moves notes, tab, chords and key together, so the
// notation, tablature, audio and analysis (which uses degree tokens) stay in step.

import {
  LETTERS, MAX_FRET, MAJOR_TONICS, MINOR_TONICS, parsePitchClass, parsePitch, transposeSpelled,
  transposeChordSymbol, parseChord, mod12,
} from './theory.mjs';

/** Letter steps and semitones from one tonic to another, choosing the nearer direction. */
export function interval(fromTonic, toTonic) {
  const a = parsePitchClass(fromTonic);
  const b = parsePitchClass(toTonic);
  if (!a || !b) throw new Error(`bad tonic ${fromTonic} -> ${toTonic}`);
  let letters = (LETTERS.indexOf(b.letter) - LETTERS.indexOf(a.letter) + 7) % 7;
  let semis = mod12(b.pc - a.pc);
  if (semis > 6) { semis -= 12; letters -= 7; }
  return { letters, semis };
}

const lineEvents = (bars) => (bars ?? []).flatMap((b) => b.events ?? []).filter((e) => !e.rest);

/** Pick the fret shift (semis, or semis +/- 12) that keeps every note on its string and in range. */
export function chooseShift(events, semis) {
  if (semis !== 0 && events.some((e) => e.fret === 0)) {
    return { error: 'the shape uses open strings, so it cannot move as a block; re-finger it without open strings' };
  }
  const candidates = [semis, semis + 12, semis - 12].sort((x, y) => Math.abs(x) - Math.abs(y));
  for (const d of candidates) {
    if (d === 0 || events.every((e) => e.fret + d >= 1 && e.fret + d <= MAX_FRET)) return { shift: d };
  }
  return { error: `no octave keeps the shape between frets 1 and ${MAX_FRET}` };
}

function moveBars(bars, letters, shift) {
  return bars.map((bar) => ({
    ...bar,
    events: bar.events.map((e) => (e.rest ? { ...e } : { ...e, fret: e.fret + shift, pitch: transposeSpelled(e.pitch, letters, shift) })),
  }));
}

function moveChords(chords, letters, semis) {
  return chords?.map((c) => ({ ...c, symbol: transposeChordSymbol(c.symbol, letters, semis) }));
}

/** Transpose a lick to a new tonic. Returns {lesson, shift} or {error}. */
export function transposeLick(lick, toTonic) {
  const { letters, semis } = interval(lick.key.tonic, toTonic);
  const all = [...lineEvents(lick.bars), ...lineEvents(lick.variation?.bars)];
  const pick = chooseShift(all, semis);
  if (pick.error) return { error: pick.error };
  const out = structuredClone(lick);
  out.key = { ...lick.key, tonic: toTonic };
  out.chords = moveChords(lick.chords, letters, semis);
  out.bars = moveBars(lick.bars, letters, pick.shift);
  if (lick.variation) {
    out.variation.bars = moveBars(lick.variation.bars, letters, pick.shift);
    if (lick.variation.chords) out.variation.chords = moveChords(lick.variation.chords, letters, semis);
  }
  if (out.bars.some((b) => b.events.some((e) => !e.rest && !e.pitch)) || out.chords.some((c) => !c.symbol)) {
    return { error: 'spelling needs a triple accidental' };
  }
  return { lesson: out, shift: pick.shift };
}

export function tonicsFor(mode) {
  return mode === 'minor' ? MINOR_TONICS : MAJOR_TONICS;
}

/** Transposition-invariant fingerprint (intervals + rhythm), used to catch repeated licks. */
export function fingerprint(lick) {
  const ev = (lick.bars ?? []).flatMap((b) => b.events ?? []);
  let prev = null;
  return ev.map((e) => {
    const len = `${e.dur}${'.'.repeat(e.dots ?? 0)}${e.tuplet ? 't' : ''}`;
    if (e.rest) return `r${len}`;
    const m = parsePitch(e.pitch)?.midi ?? 0;
    const step = prev === null ? 0 : m - prev;
    prev = m;
    return `${e.tie ? '~' : ''}${step}:${len}`;
  }).join(' ');
}

/** Compare a lick with its transposition: intervals, rhythm, roles and chord qualities must match. */
export function compareTransposition(a, b, semis) {
  const problems = [];
  const ea = (a.bars ?? []).flatMap((x) => x.events);
  const eb = (b.bars ?? []).flatMap((x) => x.events);
  if (fingerprint(a) !== fingerprint(b)) problems.push('intervals or rhythm changed');
  ea.forEach((e, i) => {
    if (e.degree !== eb[i]?.degree || e.role !== eb[i]?.role || e.finger !== eb[i]?.finger) problems.push(`event ${i + 1}: analysis or fingering changed`);
  });
  (a.chords ?? []).forEach((c, i) => {
    const x = parseChord(c.symbol);
    const y = parseChord(b.chords[i]?.symbol);
    if (!x || !y || x.quality !== y.quality || mod12(y.rootPc - x.rootPc) !== mod12(semis)) problems.push(`chord ${i + 1}: ${c.symbol} -> ${b.chords[i]?.symbol} is not a clean transposition`);
  });
  return problems;
}
