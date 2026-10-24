// The line written out note by note: a text alternative to the notation, tab and fretboard.

import type { Bar, ChordPlacement } from '@/lib/music/types';
import { Frac, eventLength, onsetToBeat } from '@/lib/music/rhythm.mjs';
import { degreeLabel } from '@/lib/music/alphatex.mjs';
import { prettyChord, prettyPitch } from '@/lib/music/pretty';
import styles from './lesson.module.css';

const ROLE_TEXT: Record<string, string> = {
  'chord-tone': 'chord tone',
  tension: 'tension',
  'approach-chromatic': 'chromatic approach',
  'approach-diatonic': 'diatonic approach',
  enclosure: 'enclosure',
  passing: 'passing tone',
  neighbor: 'neighbour tone',
  scale: 'scale tone',
};

const DUR_TEXT: Record<string, string> = { '1': 'whole', '2': 'half', '4': 'quarter', '8': 'eighth', '16': 'sixteenth', '32': 'thirty-second' };

/** 1 -> "1", 1.5 -> "1 and", 1.25 -> "1 e", 1.333 -> "1, 2nd triplet". */
export function beatText(beat: number): string {
  const whole = Math.floor(beat + 1e-9);
  const frac = beat - whole;
  const near = (x: number) => Math.abs(frac - x) < 1e-6;
  if (near(0)) return `${whole}`;
  if (near(0.5)) return `${whole} and`;
  if (near(0.25)) return `${whole} e`;
  if (near(0.75)) return `${whole} a`;
  if (near(1 / 3)) return `${whole}, 2nd triplet`;
  if (near(2 / 3)) return `${whole}, 3rd triplet`;
  return beat.toFixed(2);
}

/** The bars as a list. `bare` leaves out the disclosure, where the page already opens and closes it. */
export function NotesAsText({ bars, chords, timeSignature, bare = false }: { bars: Bar[]; chords: ChordPlacement[]; timeSignature: [number, number]; bare?: boolean }) {
  const list = (
    <ol className={styles.notesTextBars}>
      {bars.map((bar, bi) => {
        let onset = new Frac(0);
        const barChords = chords.filter((c) => c.bar === bi + 1).map((c) => `${prettyChord(c.symbol)} on beat ${c.beat}`);
        return (
          <li key={bi}>
            <strong>
              Bar {bi + 1}
              {barChords.length ? ` (${barChords.join(', ')})` : ''}
            </strong>
            <ul>
              {bar.events.map((ev, ei) => {
                const beat = onsetToBeat(onset, timeSignature);
                onset = onset.add(eventLength(ev));
                const length = `${ev.dots ? 'dotted ' : ''}${DUR_TEXT[ev.dur]}${ev.tuplet ? ' triplet' : ''}`;
                if (ev.rest) return <li key={ei}>Beat {beatText(beat)}: {length} rest</li>;
                return (
                  <li key={ei}>
                    Beat {beatText(beat)}: {prettyPitch(ev.pitch)}, {length}
                    {ev.tie ? ' (tied from the previous note)' : ''}, string {ev.string} fret {ev.fret}, {ev.finger === 'T' ? 'thumb' : `finger ${ev.finger}`}
                    {ev.degree ? `, ${degreeLabel(ev.degree)}` : ''}
                    {ev.role ? ` (${ROLE_TEXT[ev.role]})` : ''}
                    {ev.technique === 'h' ? ', hammer-on' : ev.technique === 'p' ? ', pull-off' : ev.technique === 'sl' ? ', slide' : ''}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
  if (bare) return list;
  return (
    <details className={styles.notesText}>
      <summary>Notes as text</summary>
      {list}
    </details>
  );
}
