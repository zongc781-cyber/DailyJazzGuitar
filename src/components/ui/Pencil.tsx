import type { ReactNode } from 'react';
import styles from './ui.module.css';

// Blue pencil marks, drawn by hand on a lead sheet: a tick, an underline and a loose circle.
// Underlines and circles stretch to fit the box they are given; their strokes keep their width.
const MARKS = {
  tick: { viewBox: '0 0 28 24', d: 'M3 13.5c2.4 1.6 4.6 4.1 6.6 7.4C13.4 12.4 18.6 6.2 25.5 2.5', width: 2.6, stretch: false },
  underline: { viewBox: '0 0 100 8', d: 'M2 5.2C18 3.1 33 6.4 50 4.6S83 2.9 98 4.9', width: 2, stretch: true },
  circle: { viewBox: '0 0 120 60', d: 'M64 5C95 4 116 14 115 30C114 47 83 56 55 55C26 54 4 45 5 29C6 14 29 6 58 7', width: 1.8, stretch: true },
} as const;

/** A decorative pencil mark. With `draw` the stroke draws itself once, from start to end. */
export function Pencil({ kind, draw = false, className }: { kind: keyof typeof MARKS; draw?: boolean; className?: string }) {
  const m = MARKS[kind];
  return (
    <svg
      className={[styles.pencil, draw ? styles.draw : '', className ?? ''].join(' ')}
      viewBox={m.viewBox}
      preserveAspectRatio={m.stretch ? 'none' : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <path d={m.d} pathLength={1} strokeWidth={m.width} vectorEffect={m.stretch ? 'non-scaling-stroke' : undefined} />
    </svg>
  );
}

/** A section heading with a boxed rehearsal letter, as on a chart: [A] Listen. */
export function RehearsalHeading({ letter, id, children }: { letter: string; id?: string; children: ReactNode }) {
  return (
    <div className={styles.rehearsal}>
      <span className={styles.rehearsalMark} aria-hidden="true">
        {letter}
      </span>
      <h2 id={id}>{children}</h2>
    </div>
  );
}
