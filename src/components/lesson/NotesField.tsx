'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { setNote } from '@/lib/progress/actions';
import { useHydrated, useProgress } from '@/lib/progress/store';
import ui from '@/components/ui/ui.module.css';
import styles from './lesson.module.css';

/**
 * Free-text practice notes for one lesson, saved as the learner types. `hideLabel` keeps the label
 * for screen readers only, where a title above already says "Your notes".
 */
export function NotesField({ lessonId, placeholder, hideLabel = false }: { lessonId: string; placeholder: string; hideLabel?: boolean }) {
  const id = useId();
  const hydrated = useHydrated();
  const saved = useProgress((s) => s.notes[lessonId]?.text ?? '');
  const [draft, setDraft] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const text = draft ?? saved;

  // Save shortly after typing stops, and on leaving the page.
  useEffect(() => {
    if (draft === null) return;
    pending.current = draft;
    const t = setTimeout(() => {
      setNote(lessonId, draft);
      pending.current = null;
    }, 400);
    return () => clearTimeout(t);
  }, [draft, lessonId]);

  useEffect(
    () => () => {
      if (pending.current !== null) setNote(lessonId, pending.current);
    },
    [lessonId],
  );

  return (
    <div className={styles.notesField}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : styles.notesLabel}>
        Your notes
      </label>
      <textarea
        id={id}
        className={ui.textarea}
        value={text}
        placeholder={placeholder}
        disabled={!hydrated}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (pending.current !== null) {
            setNote(lessonId, pending.current);
            pending.current = null;
          }
        }}
      />
      <p className={styles.notesHint}>Saved in this browser as you type.</p>
    </div>
  );
}
