// Pitch, tuning, chord-symbol and roman-numeral helpers.
// No dependencies, so the app can import this file in browser or server code.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 };

// Standard tuning, low to high E–A–D–G–B–E, as sounding MIDI numbers.
// String numbers follow alphaTex: string 1 is the HIGH E, string 6 is the LOW E.
export const STANDARD_TUNING = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };
export const STRING_NAMES = { 1: 'E4', 2: 'B3', 3: 'G3', 4: 'D3', 5: 'A2', 6: 'E2' };
export const MAX_FRET = 20;

const mod12 = (n) => ((n % 12) + 12) % 12;

/** "Bb" -> {letter:'B', acc:'b', pc:10} */
export function parsePitchClass(name) {
  const m = /^([A-G])(##|#|bb|b)?$/.exec(name ?? '');
  if (!m) return null;
  const acc = m[2] ?? '';
  return { letter: m[1], acc, pc: mod12(LETTER_PC[m[1]] + ACC[acc]) };
}

/** Sounding scientific pitch "C#4" -> {letter, acc, octave, midi}. C4 = 60. */
export function parsePitch(name) {
  const m = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(name ?? '');
  if (!m) return null;
  const acc = m[2] ?? '';
  const octave = Number(m[3]);
  const midi = (octave + 1) * 12 + LETTER_PC[m[1]] + ACC[acc];
  return { letter: m[1], acc, octave, midi, pc: mod12(midi) };
}

export function fretToMidi(string, fret) {
  const open = STANDARD_TUNING[string];
  return open === undefined ? null : open + fret;
}

/** Move a spelled note by `letterSteps` letters and `semitones`, keeping its spelling logic. */
export function transposeSpelled(name, letterSteps, semitones) {
  const withOct = parsePitch(name);
  const p = withOct ?? parsePitchClass(name);
  if (!p) return null;
  const li = LETTERS.indexOf(p.letter) + letterSteps;
  const newLetter = LETTERS[((li % 7) + 7) % 7];
  const targetPc = mod12(p.pc + semitones);
  let diff = mod12(targetPc - LETTER_PC[newLetter]);
  if (diff > 6) diff -= 12;
  const acc = Object.keys(ACC).find((k) => ACC[k] === diff);
  if (acc === undefined) return null; // would need a triple accidental
  if (!withOct) return newLetter + acc;
  const targetMidi = withOct.midi + semitones;
  const octave = Math.floor((targetMidi - LETTER_PC[newLetter] - diff) / 12) - 1;
  return newLetter + acc + octave;
}

// ---------- Chord symbols ----------

// Chord tones (semitones above root) and tensions written into the symbol.
const Q = (family, tones, tensions = []) => ({ family, tones, tensions });
export const CHORD_QUALITIES = {
  '': Q('maj', [0, 4, 7]),
  maj7: Q('maj', [0, 4, 7, 11]),
  maj9: Q('maj', [0, 4, 7, 11], [14]),
  'maj7#11': Q('maj', [0, 4, 7, 11], [18]),
  6: Q('maj', [0, 4, 7, 9]),
  69: Q('maj', [0, 4, 7, 9], [14]),
  m: Q('min', [0, 3, 7]),
  m7: Q('min', [0, 3, 7, 10]),
  m9: Q('min', [0, 3, 7, 10], [14]),
  m11: Q('min', [0, 3, 7, 10], [14, 17]),
  m6: Q('min6', [0, 3, 7, 9]),
  mMaj7: Q('minMaj', [0, 3, 7, 11]),
  7: Q('dom', [0, 4, 7, 10]),
  9: Q('dom', [0, 4, 7, 10], [14]),
  13: Q('dom', [0, 4, 7, 10], [14, 21]),
  '7b9': Q('dom', [0, 4, 7, 10], [13]),
  '7#9': Q('dom', [0, 4, 7, 10], [15]),
  '7#11': Q('dom', [0, 4, 7, 10], [18]),
  '7b13': Q('dom', [0, 4, 7, 10], [20]),
  '7#5': Q('dom', [0, 4, 8, 10]),
  '7b9b13': Q('dom', [0, 4, 7, 10], [13, 20]),
  '7alt': Q('dom', [0, 4, 10], [13, 15, 18, 20]),
  '7sus4': Q('dom', [0, 5, 7, 10]),
  '9sus4': Q('dom', [0, 5, 7, 10], [14]),
  m7b5: Q('halfdim', [0, 3, 6, 10]),
  dim7: Q('dim', [0, 3, 6, 9]),
  dim: Q('dim', [0, 3, 6]),
  aug: Q('aug', [0, 4, 8]),
};
// Accepted spellings -> canonical key above.
const ALIASES = {
  M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', '-7': 'm7', min7: 'm7', '-': 'm', min: 'm',
  'ø': 'm7b5', 'ø7': 'm7b5', '-7b5': 'm7b5', '°7': 'dim7', o7: 'dim7', '°': 'dim', o: 'dim',
  '+': 'aug', '7+5': '7#5', '-6': 'm6', 'm(maj7)': 'mMaj7', '6/9': '69', 'M9': 'maj9',
};

/** "Bbm7b5/E" -> {root, rootPc, quality, family, tones, tensions, bass} or null */
export function parseChord(symbol) {
  const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(symbol ?? '');
  if (!m) return null;
  const root = parsePitchClass(m[1]);
  const qKey = m[2] in CHORD_QUALITIES ? m[2] : ALIASES[m[2]];
  if (!root || qKey === undefined) return null;
  const q = CHORD_QUALITIES[qKey];
  const bass = m[3] ? parsePitchClass(m[3]) : null;
  if (m[3] && !bass) return null;
  return { root: m[1], rootPc: root.pc, quality: qKey, ...q, bass: m[3] ?? null };
}

export function transposeChordSymbol(symbol, letterSteps, semitones) {
  const m = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/.exec(symbol);
  if (!m) return null;
  const root = transposeSpelled(m[1], letterSteps, semitones);
  const bass = m[3] ? transposeSpelled(m[3], letterSteps, semitones) : null;
  if (!root || (m[3] && !bass)) return null;
  return root + m[2] + (bass ? '/' + bass : '');
}

// ---------- Degrees ----------

// Interval label -> semitones above the chord root (mod 12).
export const DEGREES = {
  1: 0, b9: 1, 9: 2, '#9': 3, b3: 3, 3: 4, 4: 5, 11: 5, '#11': 6, b5: 6,
  5: 7, '#5': 8, b13: 8, 6: 9, 13: 9, bb7: 9, b7: 10, 7: 11,
};
const TENSION_LABELS = new Set(['b9', '9', '#9', '11', '#11', 'b13', '13']);

export function degreeSemitones(label) {
  return Object.hasOwn(DEGREES, label) ? DEGREES[label] : null;
}

/** Is this degree a chord tone of the parsed chord (by pitch class)? */
export function isChordTone(chord, semis) {
  return chord.tones.some((t) => mod12(t) === mod12(semis));
}
export function isTensionLabel(label) {
  return TENSION_LABELS.has(label);
}

// ---------- Keys and roman numerals ----------

// Preferred tonic spelling for each pitch class, so transposed lessons read normally.
export const MAJOR_TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MINOR_TONICS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

const NUMERALS = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
// Roman suffix -> chord family. Case of the numeral decides major/minor triad quality.
const ROMAN_SUFFIX = {
  upper: { '': 'maj', maj7: 'maj', 'Δ7': 'maj', 'Δ': 'maj', 6: 'maj', 69: 'maj', 7: 'dom', '7alt': 'dom', '7b9': 'dom', '7#9': 'dom', '7#11': 'dom', '7b13': 'dom', '7sus4': 'dom', 9: 'dom', 13: 'dom', '+': 'aug' },
  lower: { '': 'min', 7: 'min', m7: 'min', 9: 'min', 11: 'min', 6: 'min6', maj7: 'minMaj', 'ø7': 'halfdim', 'ø': 'halfdim', m7b5: 'halfdim', 'o7': 'dim', '°7': 'dim', 'o': 'dim', '°': 'dim' },
};

function parseNumeral(text) {
  const m = /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/.exec(text);
  if (!m) return null;
  const upper = m[2] === m[2].toUpperCase();
  const family = ROMAN_SUFFIX[upper ? 'upper' : 'lower'][m[3]];
  if (family === undefined) return null;
  const semis = NUMERALS[m[2].toUpperCase()] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0);
  return { semis: mod12(semis), family };
}

/**
 * Roman numerals are measured from the key centre's tonic on major-scale degrees,
 * with explicit accidentals (bIII, bVI, bVII). Secondary functions: "V7/ii", "iiø7/iv".
 * Returns {rootPc, family} or null.
 */
export function parseRoman(roman, tonic) {
  const t = parsePitchClass(tonic);
  if (!t) return null;
  const [main, target] = roman.split('/');
  const n = parseNumeral(main);
  if (!n) return null;
  let base = 0;
  if (target) {
    const tn = parseNumeral(target);
    if (!tn) return null;
    base = tn.semis;
  }
  return { rootPc: mod12(t.pc + base + n.semis), family: n.family };
}

export { mod12 };
