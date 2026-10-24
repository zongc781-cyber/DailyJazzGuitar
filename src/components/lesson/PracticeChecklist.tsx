'use client';

import { togglePracticeItem } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { Icon } from '@/components/ui/Icon';
import styles from './lesson.module.css';

export interface PracticeItem {
  id: string;
  label: string;
  hint?: string;
}

const EMPTY: string[] = [];

/** The ids of a lesson's practice steps ticked today. Ticks are kept per local day, so tomorrow starts fresh. */
function useDone(lessonId: string, dateKey: string | null) {
  return useProgress((s) => (dateKey ? s.practice[dateKey]?.[lessonId] : undefined) ?? EMPTY);
}

/** "2 of 7 done", for the title of the row that holds the checklist. */
export function PracticeCount({ lessonId, dateKey, items }: { lessonId: string; dateKey: string | null; items: PracticeItem[] }) {
  const done = useDone(lessonId, dateKey);
  const count = items.filter((i) => done.includes(i.id)).length;
  return <span className="num">{`${count} of ${items.length} done`}</span>;
}

/** Today's practice steps for a lesson. A ticked step fills with blue. */
export function PracticeChecklist({ lessonId, dateKey, items }: { lessonId: string; dateKey: string | null; items: PracticeItem[] }) {
  const done = useDone(lessonId, dateKey);
  return (
    <ul className={styles.checklist}>
      {items.map((item) => {
        const checked = done.includes(item.id);
        return (
          <li key={item.id}>
            <label className={styles.checkItem}>
              <input type="checkbox" checked={checked} disabled={!dateKey} onChange={() => dateKey && togglePracticeItem(dateKey, lessonId, item.id)} />
              <span className={styles.checkBox} aria-hidden="true">
                <Icon name="check" size={16} className={styles.tick} />
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
  );
}
