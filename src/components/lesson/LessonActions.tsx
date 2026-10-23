'use client';

// "Learned" and "Favourite" buttons. Learning saves the lesson into the history memo shown in the
// library, with the date and the key the learner was playing in.

import { setFavourite, setLearned } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import type { LearnedEntry } from '@/lib/progress/state';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import ui from '@/components/ui/ui.module.css';
import styles from './lesson.module.css';

export function LessonActions({ id, entry, dateKey }: { id: string; entry: Omit<LearnedEntry, 'learnedOn'>; dateKey: string | null }) {
  const learned = useProgress((s) => s.learned[id] ?? null);
  const favourite = useProgress((s) => Boolean(s.favourites[id]));
  const noun = entry.kind === 'lick' ? 'lick' : 'standard';

  return (
    <div className={styles.actions}>
      {learned ? (
        <>
          <span className={`${ui.button} ${ui.done} ${styles.learnedState}`} data-testid="learned-state">
            <Icon name="check" />
            Learned
          </span>
          <button type="button" className={`${ui.button} ${ui.ghost} ${ui.small}`} onClick={() => setLearned(id, null)} aria-label="Undo learned">
            <Icon name="undo" size={18} />
            Undo
          </button>
        </>
      ) : (
        <button
          type="button"
          className={ui.button}
          disabled={!dateKey}
          onClick={() => dateKey && setLearned(id, { ...entry, learnedOn: dateKey })}
          data-testid="learned"
        >
          <Icon name="check" />
          Mark {noun} as learned
        </button>
      )}
      <button
        type="button"
        className={`${ui.button} ${styles.favourite}`}
        aria-pressed={favourite}
        disabled={!dateKey}
        onClick={() => setFavourite(id, !favourite, dateKey ?? '')}
        data-testid="favourite"
      >
        <Icon name={favourite ? 'heartFilled' : 'heart'} />
        Favourite
      </button>
      <p className={styles.learnedNote} aria-live="polite">
        {learned ? `Saved to your learned list on ${formatDate(learned.learnedOn)}${learned.key ? ` (in ${learned.key})` : ''}.` : ''}
      </p>
    </div>
  );
}
