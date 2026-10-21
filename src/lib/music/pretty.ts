// Display spellings. Lesson data and validation keep ASCII ("Bb3", "Am7b5"); the screen shows real
// accidentals ("B♭3", "Am7♭5").

import type { LessonKey } from './types';

const ACC: Record<string, string> = { '': '', '#': '♯', '##': '𝄪', b: '♭', bb: '𝄫' };

/** "Bb3" -> "B♭3". With octave false the octave number is dropped: "Bb3" -> "B♭". */
export function prettyPitch(name: string, { octave = true }: { octave?: boolean } = {}): string {
  const m = /^([A-G])(##|#|bb|b)?(-?\d+)?$/.exec(name);
  if (!m) return name;
  return m[1] + ACC[m[2] ?? ''] + (octave && m[3] !== undefined ? m[3] : '');
}

/** "Bbmaj7" -> "B♭maj7", "Am7b5" -> "Am7♭5", "D7#9/F#" -> "D7♯9/F♯", "C69" -> "C6/9". */
export function prettyChord(symbol: string): string {
  const m = /^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/.exec(symbol);
  if (!m) return symbol;
  const quality = m[3] === '69' ? '6/9' : m[3].replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
  return m[1] + ACC[m[2] ?? ''] + quality + (m[4] ? `/${m[4]}${ACC[m[5] ?? '']}` : '');
}

/** "bVII7" -> "♭VII7", "V7b9/ii" -> "V7♭9/ii". */
export function prettyRoman(roman: string): string {
  return roman.replace(/b(?=[ivIV\d])/g, '♭').replace(/#(?=[ivIV\d])/g, '♯');
}

/** {tonic:"Bb", mode:"major"} -> "B♭ major". */
export function prettyKey(key: LessonKey): string {
  return `${prettyPitch(key.tonic)} ${key.mode}`;
}
