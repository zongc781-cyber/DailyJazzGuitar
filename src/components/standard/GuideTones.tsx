'use client';

// Guide-tone exercises (3rds and 7ths through the changes), played and drawn like a lick.

import { useMemo, useState } from 'react';
import type { Standard } from '@/lib/music/types';
import { lineToAlphaTex } from '@/lib/music/alphatex.mjs';
import { PlayerProvider, type NoteHighlight } from '@/components/player/PlayerProvider';
import { PlayerScore } from '@/components/player/PlayerScore';
import { Transport } from '@/components/player/Transport';
import { Fretboard } from '@/components/player/Fretboard';
import { Segmented } from '@/components/ui/Segmented';
import { Prose, lineContext } from '@/components/lesson/Prose';
import { prettyChord } from '@/lib/music/pretty';
import styles from './standard.module.css';

export function GuideTones({ standard, showAnalysis, leftHanded }: { standard: Standard; showAnalysis: boolean; leftHanded: boolean }) {
  const [index, setIndex] = useState(0);
  const exercises = standard.guideToneExercises;
  const ex = exercises[Math.min(index, exercises.length - 1)];

  const tex = useMemo(
    () =>
      lineToAlphaTex(
        { bars: ex.bars, chords: ex.chords, timeSignature: standard.timeSignature, feel: standard.feel, tempo: standard.tempo.default, key: standard.key },
        { labels: showAnalysis ? 'degrees' : null },
      ),
    [ex, standard.timeSignature, standard.feel, standard.tempo.default, standard.key, showAnalysis],
  );
  const highlights = useMemo<NoteHighlight[][] | null>(
    () => (showAnalysis ? ex.bars.map((bar) => bar.events.map((ev) => ({ role: ev.rest ? null : (ev.role ?? null) }))) : null),
    [ex, showAnalysis],
  );
  const ctx = useMemo(() => lineContext(ex.bars, ex.chords, standard.key), [ex, standard.key]);

  return (
    <div className={styles.guideTones}>
      {exercises.length > 1 ? (
        <Segmented
          label="Exercise"
          value={String(index)}
          options={exercises.map((e, i) => ({ value: String(i), label: `Exercise ${i + 1}` }))}
          onChange={(v) => setIndex(Number(v))}
        />
      ) : null}
      <div className={styles.exerciseText}>
        <h3>{ex.title}</h3>
        <p className={styles.exerciseChords}>{ex.chords.map((c) => prettyChord(c.symbol)).join(' · ')}</p>
        {ex.description ? <Prose text={ex.description} ctx={ctx} /> : null}
      </div>
      <PlayerProvider key={index} tex={tex} tempo={standard.tempo} label={`${ex.title}: standard notation and tablature`} highlights={highlights}>
        <PlayerScore />
        <Transport />
        <Fretboard bars={ex.bars} showAnalysis={showAnalysis} leftHanded={leftHanded} />
      </PlayerProvider>
    </div>
  );
}
