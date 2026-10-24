import styles from './screens.module.css';

/** Placeholder while the browser works out today's lesson (it depends on the local date). */
export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div className={styles.full} aria-busy="true">
      <p className="visually-hidden" role="status">
        {label}…
      </p>
      <LessonSkeleton />
    </div>
  );
}

/** The shape of a lesson's first screen, in blue: a label, a very large title, a line and one button. */
export function LessonSkeleton() {
  return (
    <div className={styles.heroSkeleton} data-hero="blue" aria-hidden="true">
      <span style={{ width: '22%', height: 12 }} />
      <div className={styles.heroSkeletonMain}>
        <span style={{ width: '74%', height: 'calc(var(--text-hero) * 0.7)' }} />
        <span style={{ width: '46%', height: 'calc(var(--text-hero) * 0.7)' }} />
        <span style={{ width: '30%', height: 24, marginTop: 8 }} />
        <span style={{ width: 220, height: 60, borderRadius: 999 }} />
      </div>
    </div>
  );
}
