// Small text helpers for the weekly standard's copy.

/** Typographer's quotes: "and" -> “and”, Somethin' -> Somethin’, 'Autumn Leaves' -> ‘Autumn Leaves’. */
export function curly(text: string): string {
  return text
    .replace(/"([^"]*)"/g, '“$1”')
    .replace(/(^|[\s(“])'/g, '$1‘')
    .replace(/'/g, '’');
}

// A flat or sharp written in ASCII before a scale degree or a roman numeral, at the start of a word,
// or on the extension of a roman numeral ("V7b9").
const FLAT = /(^|[\s(/–-])b(?=\d|(?:I{1,3}|IV|VI{0,2}|i{1,3}|iv|vi{0,2})(?![a-z]))/g;
const SHARP = /(^|[\s(/–-])#(?=\d|(?:I{1,3}|IV|VI{0,2}|i{1,3}|iv|vi{0,2})(?![a-z]))/g;
const ALTERED = /(^|[\s(/–-])((?:I{1,3}|IV|VI{0,2}|i{1,3}|iv|vi{0,2})ø?\d+)([b#])(?=\d)/g;

/**
 * Prose as it should be set: typographer's quotes, and real accidentals where the lesson data writes
 * degrees and roman numerals in ASCII ("the b9 of the bVImaj7, the V7b9" -> "the ♭9 of the ♭VImaj7,
 * the V7♭9"), as pretty.ts does for chord symbols. Chord symbols such as "Bb7" and "Am7b5" are left
 * alone.
 */
export function typeset(text: string): string {
  return curly(text)
    .replace(FLAT, '$1♭')
    .replace(SHARP, '$1♯')
    .replace(ALTERED, (_, before: string, roman: string, sign: string) => `${before}${roman}${sign === 'b' ? '♭' : '♯'}`);
}

/** count(4, "recording") -> "4 recordings", count(1, "recording") -> "1 recording". */
export function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** ["a", "b", "c"] -> "a, b and c". */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Bar numbers as runs: [7, 8, 15, 16, 29] -> "7–8, 15–16 and 29". */
export function barRuns(bars: number[]): string {
  const runs: string[] = [];
  let start = bars[0];
  for (let i = 1; i <= bars.length; i++) {
    if (bars[i] === bars[i - 1] + 1) continue;
    const end = bars[i - 1];
    runs.push(start === end ? `${start}` : `${start}–${end}`);
    start = bars[i];
  }
  return listJoin(runs);
}
