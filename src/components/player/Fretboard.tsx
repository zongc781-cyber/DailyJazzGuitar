'use client';

// Fretboard diagram drawn from the same string/fret/finger fields as the notation and tab. High E
// is on top and low E at the bottom, as in tab. The note under alphaTab's playback cursor is
// highlighted. With the analysis on, each note shows its degree and role (colour plus shape).

import { useId } from 'react';
import type { Bar, NoteEvent, Role } from '@/lib/music/types';
import { degreeLabel } from '@/lib/music/alphatex.mjs';
import { prettyPitch } from '@/lib/music/pretty';
import { ROLE_CLASS, ROLE_SHAPE, type RoleShape } from '@/lib/music/roles';
import { useActiveNote } from './PlayerProvider';
import styles from './fretboard.module.css';

const STRING_LABELS = ['', 'e', 'B', 'G', 'D', 'A', 'E'];
const INLAYS = [3, 5, 7, 9, 15, 17, 19];
const FRET_W = 58;
const STRING_GAP = 26;
const LEFT = 34;
const TOP = 18;

interface Spot {
  string: number;
  fret: number;
  finger: NoteEvent['finger'];
  pitch: string;
  degree?: string;
  role?: Role;
  resolution: boolean;
  refs: string[];
}

export function Fretboard({
  bars,
  showAnalysis,
  leftHanded,
  resolution,
  caption,
}: {
  bars: Bar[];
  showAnalysis: boolean;
  leftHanded: boolean;
  /** [bar, event], 1-based, of the resolution note. */
  resolution?: [number, number];
  caption?: string;
}) {
  const active = useActiveNote();
  const titleId = useId();
  const spots = new Map<string, Spot>();
  bars.forEach((bar, bi) =>
    bar.events.forEach((ev, ei) => {
      if (ev.rest || ev.tie) return;
      const key = `${ev.string}.${ev.fret}`;
      const isRes = resolution?.[0] === bi + 1 && resolution?.[1] === ei + 1;
      const spot = spots.get(key) ?? { string: ev.string, fret: ev.fret, finger: ev.finger, pitch: ev.pitch, degree: ev.degree, role: ev.role, resolution: false, refs: [] };
      spot.refs.push(`${bi}.${ei}`);
      if (isRes) spot.resolution = true;
      spots.set(key, spot);
    }),
  );
  const list = [...spots.values()];
  const frets = list.map((s) => s.fret);
  const lo = Math.max(1, Math.min(...frets) - 1);
  const hi = Math.max(lo + 4, Math.max(...frets) + 1);
  const count = hi - lo + 1;
  const width = LEFT + count * FRET_W + 12;
  const height = TOP + STRING_GAP * 5 + 34;
  const activeKey = active ? `${active.bar}.${active.event}` : null;
  const x = (fret: number) => LEFT + (fret - lo + 0.5) * FRET_W;
  const y = (string: number) => TOP + (string - 1) * STRING_GAP;
  const position = Math.min(...list.map((s) => (typeof s.finger === 'number' && s.finger > 0 ? s.fret - s.finger + 1 : s.fret)));

  return (
    <figure className={styles.figure}>
      <div className={styles.scroller}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={styles.board}
          role="img"
          aria-labelledby={titleId}
          style={{ minWidth: Math.min(width, 520) }}
          data-left-handed={leftHanded || undefined}
        >
          <title id={titleId}>{`Fretboard, frets ${lo} to ${hi}: ${list.map((s) => `${prettyPitch(s.pitch)} on string ${s.string} fret ${s.fret}`).join('; ')}`}</title>
          <g className={leftHanded ? styles.mirror : undefined} style={leftHanded ? { transformOrigin: `${width / 2}px 0` } : undefined}>
            <rect x={LEFT} y={TOP - 8} width={count * FRET_W} height={STRING_GAP * 5 + 16} rx="6" className={styles.wood} />
            {INLAYS.filter((f) => f >= lo && f <= hi).map((f) => (
              <circle key={f} cx={x(f)} cy={TOP + STRING_GAP * 2.5} r="5" className={styles.inlay} />
            ))}
            {12 >= lo && 12 <= hi ? (
              <>
                <circle cx={x(12)} cy={TOP + STRING_GAP * 1.5} r="5" className={styles.inlay} />
                <circle cx={x(12)} cy={TOP + STRING_GAP * 3.5} r="5" className={styles.inlay} />
              </>
            ) : null}
            {Array.from({ length: count + 1 }, (_, i) => (
              <line key={i} x1={LEFT + i * FRET_W} x2={LEFT + i * FRET_W} y1={TOP - 8} y2={TOP + STRING_GAP * 5 + 8} className={lo === 1 && i === 0 ? styles.nut : styles.fret} />
            ))}
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <line key={s} x1={LEFT} x2={LEFT + count * FRET_W} y1={y(s)} y2={y(s)} className={styles.string} style={{ strokeWidth: 0.8 + s * 0.28 }} />
            ))}
            {list.map((spot) => {
              const isActive = activeKey !== null && spot.refs.includes(activeKey);
              const roleClass = showAnalysis && spot.role ? styles[spot.resolution ? 'resolution' : ROLE_CLASS[spot.role]] : styles.plain;
              const shape: RoleShape = showAnalysis && spot.role ? ROLE_SHAPE[spot.role] : 'circle';
              const cx = x(spot.fret);
              const cy = y(spot.string);
              const label = showAnalysis && spot.degree ? degreeLabel(spot.degree) : spot.finger === 'T' ? 'T' : String(spot.finger);
              return (
                <g key={`${spot.string}.${spot.fret}`} className={`${styles.spot} ${roleClass} ${isActive ? styles.active : ''}`}>
                  {isActive ? <circle cx={cx} cy={cy} r="17" className={styles.halo} /> : null}
                  {shape === 'diamond' ? (
                    <rect x={cx - 10} y={cy - 10} width="20" height="20" rx="3" transform={`rotate(45 ${cx} ${cy})`} className={styles.mark} />
                  ) : shape === 'square' ? (
                    <rect x={cx - 11} y={cy - 11} width="22" height="22" rx="4" className={styles.mark} />
                  ) : (
                    <circle cx={cx} cy={cy} r="12" className={`${styles.mark} ${shape === 'ring' ? styles.ring : ''}`} />
                  )}
                  <text x={cx} y={cy} className={`${styles.label} ${leftHanded ? styles.unmirror : ''}`} style={leftHanded ? { transformOrigin: `${cx}px ${cy}px` } : undefined} dy="0.35em">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <text key={s} x={leftHanded ? width - 14 : 14} y={y(s)} dy="0.35em" className={styles.stringName}>
              {STRING_LABELS[s]}
            </text>
          ))}
          {Array.from({ length: count }, (_, i) => lo + i).map((f) => (
            <text key={f} x={leftHanded ? width - x(f) : x(f)} y={TOP + STRING_GAP * 5 + 26} className={styles.fretNumber}>
              {f}
            </text>
          ))}
        </svg>
      </div>
      <figcaption className={styles.caption}>
        {caption ?? `Position ${ordinal(position)} · frets ${lo}–${hi}`} · {showAnalysis ? 'degrees shown' : 'numbers are fingers (1 index … 4 little)'}
      </figcaption>
    </figure>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
