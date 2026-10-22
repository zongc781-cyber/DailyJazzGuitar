'use client';

import { togglePracticeItem } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { Pencil } from '@/components/ui/Pencil';
import styles from './lesson.module.css';

export interface PracticeItem {
  id: string;
  label: string;
  hint?: string;
}

const EMPTY: string[] = [];

/** Today's practice steps for a lesson, ticked in blue pencil. Ticks are kept per local day, so tomorrow starts fresh. */
export function PracticeChecklist({ lessonId, dateKey, items, title = 'Practice checklist' }: { lessonId: string; dateKey: string | null; items: PracticeItem[]; title?: string }) {
  const done = useProgress((s) => (dateKey ? s.practice[dateKey]?.[lessonId] : undefined) ?? EMPTY);
  const count = items.filter((i) => done.includes(i.id)).length;
  return (
    <div className={styles.checklist}>
      <div className={styles.checklistHeader}>
        <h3>{title}</h3>
        <span className={`${styles.checklistCount} num`}>
          <span aria-hidden="true">
            {count}/{items.length}
          </span>
          <span className="visually-hidden">{`${count} of ${items.length} done today`}</span>
        </span>
      </div>
      <ul>
        {items.map((item) => {
          const checked = done.includes(item.id);
          return (
            <li key={item.id}>
              <label className={styles.checkItem}>
                <input type="checkbox" checked={checked} disabled={!dateKey} onChange={() => dateKey && togglePracticeItem(dateKey, lessonId, item.id)} />
                <span className={styles.checkBox} aria-hidden="true">
                  {checked ? <Pencil kind="tick" draw className={styles.tick} /> : null}
                </span>
                <span className={styles.checkText}>
                  <span>{item.label}</span>
                  {item.hint ? <span className={styles.checkHint}>{item.hint}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
