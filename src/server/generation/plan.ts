// Decides what the next generated lick should be: which standard it serves, which bars of that
// standard's chart it plays over, and whose style it is in. Planning is deterministic, so the
// same library always produces the same brief, and each published lick changes the next plan.

import { parseChord, parsePitchClass, mod12 } from '../../lib/music/index.mjs';
import type { ChordPlacement, Lesson, LessonKey, Lick, Standard } from '../../lib/music/types';
import { GUITARISTS, type Guitarist } from './guitarists';

export interface LickPlan {
  /** Id the new lesson will be published under. */
  id: string;
  standard: Standard;
  /** First and last bar of the passage, counted through the whole form (1-based). */
  bars: [number, number];
  /** Form section the passage starts in, e.g. "A2". */
  section: string | null;
  /** Key centre of the passage, which becomes the lick's key. */
  key: LessonKey;
  /** The passage's chords, renumbered so the lick starts at bar 1. */
  chords: ChordPlacement[];
  guitarist: Guitarist;
  /** Licks already written over this standard, so the generator can avoid their ideas. */
  existing: { title: string; artist?: string }[];
}

const isTonic = (roman: string) => /^[Ii](?![IiVv])/.test(roman);

export function planNextLick(library: Lesson[]): LickPlan | null {
  const standards = library.filter((l): l is Standard => l.kind === 'standard');
  const licks = library.filter((l): l is Lick => l.kind === 'lick');
  if (standards.length === 0) return null;

  // The standard with the fewest licks, in curriculum order when tied.
  const count = (s: Standard) => licks.filter((l) => l.standardId === s.id).length;
  const standard = standards.reduce((best, s) => (count(s) < count(best) ? s : best));
  const own = licks.filter((l) => l.standardId === standard.id);

  const passage = choosePassage(standard, own);
  if (!passage) return null;
  const guitarist = chooseGuitarist(standard, licks);
  const base = `gen-${standard.id}-${slug(guitarist.name)}`;
  const ids = new Set(library.map((l) => l.id));
  let n = 1;
  while (ids.has(`${base}-${n}`)) n++;

  return {
    id: `${base}-${n}`,
    standard,
    ...passage,
    guitarist,
    existing: own.map((l) => ({ title: l.title, artist: l.inspiration.artist })),
  };
}

interface Passage {
  bars: [number, number];
  section: string | null;
  key: LessonKey;
  chords: ChordPlacement[];
}

/** Every 2–4 bar window inside one key centre, preferring harmony no lick covers yet. */
export function candidatePassages(standard: Standard): Passage[] {
  const out: Passage[] = [];
  const total = standard.chart.length;
  for (let first = 1; first <= total; first++) {
    for (const length of [3, 2, 4]) {
      const last = first + length - 1;
      if (last > total) continue;
      const centre = standard.keyCenters.find((k) => k.bars[0] <= first && last <= k.bars[1]);
      if (!centre) continue;
      const chords: ChordPlacement[] = [];
      for (let bar = first; bar <= last; bar++) {
        for (const c of standard.chart[bar - 1].chords) chords.push({ symbol: c.symbol, bar: bar - first + 1, beat: c.beat });
      }
      if (chords[0].beat !== 1) chords.unshift({ symbol: soundingBefore(standard, first), bar: 1, beat: 1 });
      out.push({ bars: [first, last], section: sectionAt(standard, first), key: { tonic: centre.tonic, mode: centre.mode }, chords });
    }
  }
  return out;
}

function choosePassage(standard: Standard, licks: Lick[]): Passage | null {
  const covered = new Set(licks.map((l) => harmonyKey(l.chords, l.key)));
  let best: { passage: Passage; score: number } | null = null;
  for (const passage of candidatePassages(standard)) {
    if (covered.has(harmonyKey(passage.chords, passage.key))) continue;
    const lastBar = standard.chart[passage.bars[1] - 1].chords;
    const distinct = new Set(passage.chords.map((c) => c.symbol)).size;
    // Lines that resolve to the key centre's tonic teach the most; then more chord changes.
    const score = (isTonic(lastBar[lastBar.length - 1].roman) ? 10 : 0) + Math.min(distinct, 3) * 2 + (passage.bars[1] - passage.bars[0] === 2 ? 1 : 0);
    if (!best || score > best.score) best = { passage, score };
  }
  return best?.passage ?? null;
}

/** The chords of a passage measured from its key's tonic, so a transposed lick still matches. */
function harmonyKey(chords: ChordPlacement[], key: LessonKey): string {
  const tonic = parsePitchClass(key.tonic)?.pc ?? 0;
  return chords
    .map((c) => {
      const p = parseChord(c.symbol);
      return p ? `${c.bar}:${c.beat}:${mod12(p.rootPc - tonic)}${p.quality}` : `${c.bar}:${c.beat}:?`;
    })
    .join(' ');
}

function chooseGuitarist(standard: Standard, licks: Lick[]): Guitarist {
  const fits = GUITARISTS.filter((g) => g.feels.includes(standard.feel));
  const pool = fits.length ? fits : GUITARISTS;
  const uses = (g: Guitarist) => licks.filter((l) => l.inspiration.artist === g.name).length;
  const latest = licks[licks.length - 1]?.inspiration.artist;
  const ranked = [...pool].sort((a, b) => uses(a) - uses(b) || Number(a.name === latest) - Number(b.name === latest));
  return ranked[0];
}

function soundingBefore(standard: Standard, bar: number): string {
  for (let b = bar - 1; b >= 1; b--) {
    const chords = standard.chart[b - 1].chords;
    if (chords.length) return chords[chords.length - 1].symbol;
  }
  return standard.chart[0].chords[0].symbol;
}

function sectionAt(standard: Standard, bar: number): string | null {
  let end = 0;
  for (const s of standard.form.sections) {
    end += s.bars;
    if (bar <= end) return s.label;
  }
  return null;
}

function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
