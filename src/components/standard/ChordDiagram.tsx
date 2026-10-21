// A guitar chord box for one voicing: low E on the left, high E on the right (mirrored for
// left-handed players). Dots show fingers, or chord degrees when the analysis is on.

import type { Voicing, VoicingNote } from '@/lib/music/types';
import { degreeLabel } from '@/lib/music/alphatex.mjs';
import { prettyChord, prettyPitch } from '@/lib/music/pretty';
import styles from './standard.module.css';

const STRING_X = 26; // room on the left for the base fret number
const GAP = 20;
const TOP = 30;
const FRET_H = 26;

export function ChordDiagram({ voicing, showAnalysis, leftHanded }: { voicing: Voicing; showAnalysis: boolean; leftHanded: boolean }) {
  const fretted = voicing.notes.filter((n) => n.fret > 0).map((n) => n.fret);
  const max = fretted.length ? Math.max(...fretted) : 1;
  const min = fretted.length ? Math.min(...fretted) : 1;
  const base = max <= 4 ? 1 : min;
  const rows = Math.max(4, max - base + 1);
  const width = STRING_X * 2 + GAP * 5;
  const height = TOP + rows * FRET_H + 14;
  // String 6 (low E) is the leftmost column; mirrored for left-handed players.
  const x = (string: number) => (leftHanded ? STRING_X + (string - 1) * GAP : STRING_X + (6 - string) * GAP);
  const y = (fret: number) => TOP + (fret - base + 0.5) * FRET_H;
  const byString = new Map<number, VoicingNote>(voicing.notes.map((n) => [n.string, n]));
  const description = [...voicing.notes]
    .sort((a, b) => b.string - a.string)
    .map((n) => `string ${n.string} fret ${n.fret} ${prettyPitch(n.pitch)} (${degreeLabel(n.degree)}, ${n.finger === 'T' ? 'thumb' : `finger ${n.finger}`})`)
    .join('; ');
  const muted = [1, 2, 3, 4, 5, 6].filter((s) => !byString.has(s));

  return (
    <figure className={styles.voicing}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`${prettyChord(voicing.symbol)} voicing: ${description}${muted.length ? `; strings ${muted.join(', ')} not played` : ''}`}
        className={styles.voicingSvg}
      >
        {base === 1 ? (
          <rect x={STRING_X - 1} y={TOP - 5} width={GAP * 5 + 2} height="5" rx="1.5" className={styles.vNut} />
        ) : (
          <text x={leftHanded ? width - 2 : 2} y={TOP + FRET_H * 0.5} dy="0.35em" className={styles.vBase} textAnchor={leftHanded ? 'end' : 'start'}>
            {base}
          </text>
        )}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line key={`f${i}`} x1={STRING_X} x2={STRING_X + GAP * 5} y1={TOP + i * FRET_H} y2={TOP + i * FRET_H} className={styles.vFret} />
        ))}
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <line key={`s${s}`} x1={x(s)} x2={x(s)} y1={TOP} y2={TOP + rows * FRET_H} className={styles.vString} />
        ))}
        {[1, 2, 3, 4, 5, 6].map((s) => {
          const n = byString.get(s);
          if (n && n.fret > 0) return null;
          return (
            <text key={`m${s}`} x={x(s)} y={TOP - 12} className={styles.vMuted}>
              {n ? 'o' : '×'}
            </text>
          );
        })}
        {voicing.notes
          .filter((n) => n.fret > 0)
          .map((n) => {
            const isRoot = n.degree === '1';
            return (
              <g key={n.string}>
                <circle cx={x(n.string)} cy={y(n.fret)} r="8.5" className={`${styles.vDot} ${showAnalysis && isRoot ? styles.vRoot : ''}`} />
                <text x={x(n.string)} y={y(n.fret)} dy="0.35em" className={styles.vLabel}>
                  {showAnalysis ? degreeLabel(n.degree) : n.finger === 'T' ? 'T' : n.finger}
                </text>
              </g>
            );
          })}
      </svg>
      <figcaption>
        <span className={styles.voicingSymbol}>{prettyChord(voicing.symbol)}</span>
        {voicing.name ? <span className={styles.voicingName}>{voicing.name}</span> : null}
      </figcaption>
    </figure>
  );
}
