'use client';

import { Pencil } from '@/components/ui/Pencil';
import ui from '@/components/ui/ui.module.css';
import styles from '@/components/screens/screens.module.css';

const STAFF = [44, 52, 60, 68, 76];
const NOTES = [
  { x: 76, y: 68 },
  { x: 146, y: 60 },
  { x: 222, y: 56 },
  { x: 300, y: 48 },
];

/** A line of music with one wrong note, circled in blue pencil as a teacher would. */
function WrongNote() {
  return (
    <div className={styles.lostArt} aria-hidden="true">
      <svg viewBox="0 0 400 96" focusable="false">
        {STAFF.map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} className={styles.lostStaff} />
        ))}
        <line x1="0.75" x2="0.75" y1="44" y2="76" className={styles.lostBar} />
        <line x1="399.25" x2="399.25" y1="44" y2="76" className={styles.lostBar} />
        {NOTES.map(({ x, y }) => (
          <g key={x}>
            <ellipse cx={x} cy={y} rx="6.4" ry="4.6" transform={`rotate(-22 ${x} ${y})`} className={styles.lostInk} />
            <line x1={x + 5.8} x2={x + 5.8} y1={y - 1.5} y2={y - 30} className={styles.lostBar} />
          </g>
        ))}
        {/* The sharp that makes the third note wrong. */}
        <g className={styles.lostBar}>
          <line x1="201" x2="201" y1="45" y2="68" />
          <line x1="206" x2="206" y1="44" y2="67" />
        </g>
        <path d="M198 54.5l11-3.2M198 60.5l11-3.2" className={styles.lostThick} />
      </svg>
      <span className={styles.wrongNote}>
        <Pencil kind="circle" draw className={styles.wrongNoteMark} />
      </span>
    </div>
  );
}

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={`${styles.screen} ${styles.page} ${styles.lost}`} role="alert">
      <WrongNote />
      <header className={styles.pageHeader}>
        <p className={ui.eyebrow}>Something went wrong</p>
        <h1 className={styles.headline}>That was a wrong note</h1>
        <p className={styles.pageIntro}>This page stopped while it was being drawn. Your progress is safe in this browser, so try again.</p>
      </header>
      <p className={styles.lostActions}>
        <button type="button" className={`${ui.button} ${ui.primary}`} onClick={reset}>
          Try again
        </button>
        {error.digest ? <span className={styles.lostRef}>Error reference {error.digest}</span> : null}
      </p>
    </div>
  );
}
