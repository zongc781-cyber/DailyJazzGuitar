import type { Inspiration, Source } from '@/lib/music/types';
import { curly, typeset } from '@/lib/text';
import { Icon } from '@/components/ui/Icon';
import styles from './lesson.module.css';

const KIND: Record<Source['kind'], string> = {
  recording: 'Recording',
  book: 'Book',
  method: 'Method',
  website: 'Website',
  video: 'Video',
  'lead-sheet': 'Lead sheet',
};

export function InspirationNote({ inspiration }: { inspiration: Inspiration }) {
  const { type, artist, recording, year, at, note } = inspiration;
  const listen = recording ? `${curly(recording)}${year ? ` (${year})` : ''}${at ? `, around ${at}` : ''}` : null;
  return (
    <div className={styles.inspiration}>
      {type === 'in-the-style-of' ? (
        <p>
          <strong>In the style of {artist}.</strong> This is an original phrase written for this app using vocabulary associated with {artist}. It is
          not a transcription of a recorded solo.
        </p>
      ) : type === 'transcription' ? (
        <p>
          <strong>Transcription</strong> of {artist}
          {listen ? ` on ${listen}` : ''}.
        </p>
      ) : type === 'method-exercise' ? (
        <p>
          <strong>Method exercise</strong>
          {artist ? ` after ${artist}` : ''}.
        </p>
      ) : (
        <p>
          <strong>Original phrase</strong>
          {artist ? ` drawing on ${artist}` : ''}.
        </p>
      )}
      {type !== 'transcription' && listen ? <p>Hear the vocabulary in context: {listen}.</p> : null}
      {note ? <p>{typeset(note)}</p> : null}
    </div>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className={styles.sources}>
      {sources.map((s, i) => (
        <li key={i}>
          <span className={styles.sourceKind}>{KIND[s.kind]}</span>
          <span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {curly(s.title)}
                <Icon name="external" size={14} className={styles.externalIcon} />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ) : (
              <cite>{curly(s.title)}</cite>
            )}
            {s.author ? ` · ${s.author}` : ''}
            {s.year ? ` · ${s.year}` : ''}
            {s.detail ? <span className={styles.sourceDetail}> {typeset(s.detail)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
