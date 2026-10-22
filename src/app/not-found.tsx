import Link from 'next/link';
import ui from '@/components/ui/ui.module.css';
import styles from '@/components/screens/screens.module.css';

const STAFF = [44, 52, 60, 68, 76];

/** A multi-bar rest with its count written over it, as on a part: 404 bars with nothing to play. */
function FourOhFourBarRest() {
  return (
    <div className={styles.lostArt} aria-hidden="true">
      <svg viewBox="0 0 400 96" focusable="false">
        {STAFF.map((y) => (
          <line key={y} x1="0" x2="400" y1={y} y2={y} className={styles.lostStaff} />
        ))}
        <line x1="0.75" x2="0.75" y1="44" y2="76" className={styles.lostBar} />
        <rect x="118" y="55" width="164" height="10" className={styles.lostInk} />
        <rect x="118" y="47" width="2.5" height="26" className={styles.lostInk} />
        <rect x="279.5" y="47" width="2.5" height="26" className={styles.lostInk} />
        <text x="200" y="34" textAnchor="middle" className={styles.lostNumber}>
          404
        </text>
        {/* The final barline: the end of the piece. */}
        <line x1="388.5" x2="388.5" y1="44" y2="76" className={styles.lostBar} />
        <rect x="393" y="44" width="5" height="32" className={styles.lostInk} />
      </svg>
    </div>
  );
}

export default function NotFound() {
  return (
    <div className={`${styles.screen} ${styles.page} ${styles.lost}`}>
      <FourOhFourBarRest />
      <header className={styles.pageHeader}>
        <p className={ui.eyebrow}>Not found</p>
        <h1 className={styles.headline}>This page isn’t in the book</h1>
        <p className={styles.pageIntro}>The link may be old or mistyped, but today’s lick is always on the stand.</p>
      </header>
      <p className={styles.lostActions}>
        <Link href="/" className={`${ui.button} ${ui.primary}`}>
          Open today’s lick
        </Link>
        <Link href="/library?tab=all" className={styles.quietLink}>
          Browse the library
        </Link>
      </p>
    </div>
  );
}
