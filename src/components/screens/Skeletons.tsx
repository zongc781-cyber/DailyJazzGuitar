import ui from '@/components/ui/ui.module.css';
import styles from './screens.module.css';

/** Placeholder while the browser works out today's lesson (it depends on the local date). */
export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.screen} aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}…
      </p>
      <LessonSkeleton />
    </div>
  );
}

/** The shape of a lesson page: label, headline, byline, chords, then the score sheet. */
export function LessonSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={ui.skeleton} style={{ width: '28%', height: 14 }} />
      <div className={ui.skeleton} style={{ width: '72%', height: 64, marginTop: 6 }} />
      <div className={ui.skeleton} style={{ width: '38%', height: 26 }} />
      <div className={ui.skeleton} style={{ width: '34%', height: 38, marginTop: 8 }} />
      <div className={ui.skeleton} style={{ width: '100%', height: 40, marginTop: 36 }} />
      <div className={ui.skeleton} style={{ width: '100%', height: 420, marginTop: 10, borderRadius: 'var(--radius-l)' }} />
    </div>
  );
}
