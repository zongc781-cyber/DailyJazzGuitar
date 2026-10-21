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

export function LessonSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={ui.skeleton} style={{ width: '40%', height: 14 }} />
      <div className={ui.skeleton} style={{ width: '70%', height: 40 }} />
      <div className={ui.skeleton} style={{ width: '50%', height: 18 }} />
      <div className={ui.skeleton} style={{ width: '100%', height: 260 }} />
      <div className={ui.skeleton} style={{ width: '100%', height: 120 }} />
    </div>
  );
}
