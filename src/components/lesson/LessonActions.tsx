'use client';

// Learned and Favourite, as two round buttons beside a lesson's first action on its blue first
// screen. Learning saves the lesson into the library's learned list, with the date and the key the
// learner was playing in; pressing it again takes it out.

import { setFavourite, setLearned } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import type { LearnedEntry } from '@/lib/progress/state';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import styles from './lesson.module.css';

export function LessonActions({ id, entry, dateKey }: { id: string; entry: Omit<LearnedEntry, 'learnedOn'>; dateKey: string | null }) {
  const learned = useProgress((s) => s.learned[id] ?? null);
  const favourite = useProgress((s) => Boolean(s.favourites[id]));
  const noun = entry.kind === 'lick' ? 'lick' : 'standard';
  const learnedOn = learned ? `${formatDate(learned.learnedOn)}${learned.key ? ` in ${learned.key}` : ''}` : '';

  return (
    <div className={styles.marks}>
      <button
        type="button"
        className={styles.mark}
        aria-pressed={Boolean(learned)}
        aria-label="Learned"
        title={learned ? `Learned on ${learnedOn}. Press again to undo.` : `Mark this ${noun} as learned`}
        disabled={!dateKey}
        onClick={() => (learned ? setLearned(id, null) : dateKey && setLearned(id, { ...entry, learnedOn: dateKey }))}
        data-testid="learned"
      >
        <Icon name="check" size={26} />
      </button>
      <button
        type="button"
        className={styles.mark}
        aria-pressed={favourite}
        aria-label="Favourite"
        title={favourite ? 'In your favourites. Press again to take it out.' : 'Add to your favourites'}
        disabled={!dateKey}
        onClick={() => setFavourite(id, !favourite, dateKey ?? '')}
        data-testid="favourite"
      >
        <Icon name={favourite ? 'heartFilled' : 'heart'} size={26} />
      </button>
      <p className="visually-hidden" aria-live="polite">
        {learned ? `Saved to your learned list on ${learnedOn}.` : ''}
      </p>
    </div>
  );
}
