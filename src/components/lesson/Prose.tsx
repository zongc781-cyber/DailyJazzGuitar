// Lesson prose with music tokens. Lesson text never spells notes or chords directly: it says
// {{note 2.3}}, {{chord 1}} or {{key}}, and this component fills them in from the line being shown,
// so the words follow the notation into any key.

import { Fragment, type ReactNode } from 'react';
import type { Bar, ChordPlacement, LessonKey, NoteEvent } from '@/lib/music/types';
import { prettyChord, prettyKey, prettyPitch } from '@/lib/music/pretty';
import { typeset } from '@/lib/text';
import styles from './lesson.module.css';

export interface ProseContext {
  /** 1-based bar and event. */
  note: (bar: number, event: number) => NoteEvent | null;
  /** 1-based position in the chord list. */
  chord: (n: number) => string | null;
  keyName: string;
}

const TOKEN = /\{\{\s*(note|chord|key)\s*([^}]*)\}\}/g;

export function lineContext(bars: Bar[], chords: { symbol: string }[] | ChordPlacement[], key: LessonKey): ProseContext {
  return {
    note: (b, i) => {
      const ev = bars[b - 1]?.events[i - 1];
      return ev && !ev.rest ? ev : null;
    },
    chord: (n) => chords[n - 1]?.symbol ?? null,
    keyName: prettyKey(key),
  };
}

function renderTokens(text: string, ctx: ProseContext): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [, kind, arg] = m;
    if (kind === 'key') {
      out.push(
        <span key={index} className={styles.tokKey}>
          {ctx.keyName}
        </span>,
      );
    } else if (kind === 'chord') {
      const symbol = ctx.chord(Number(arg.trim()));
      out.push(
        <span key={index} className={styles.tokChord}>
          {symbol ? prettyChord(symbol) : '?'}
        </span>,
      );
    } else {
      const [b, i] = arg.trim().split('.').map(Number);
      const ev = ctx.note(b, i);
      out.push(
        <span key={index} className={styles.tokNote} title={ev ? `${prettyPitch(ev.pitch)}, string ${ev.string} fret ${ev.fret}` : undefined}>
          {ev ? prettyPitch(ev.pitch, { octave: false }) : '?'}
        </span>,
      );
    }
    last = index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Paragraphs separated by blank lines; tokens filled in, with curly quotes and real accidentals. */
export function Prose({ text, ctx, className }: { text: string; ctx: ProseContext; className?: string }) {
  const paragraphs = typeset(text).split(/\n\s*\n/);
  return (
    <div className={`${styles.prose} ${className ?? ''}`}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderTokens(p.trim(), ctx)}</p>
      ))}
    </div>
  );
}

/** One line of prose without a paragraph wrapper (list items, table cells). */
export function InlineProse({ text, ctx }: { text: string; ctx: ProseContext }) {
  return <Fragment>{renderTokens(typeset(text), ctx)}</Fragment>;
}
