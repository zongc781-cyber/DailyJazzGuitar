'use client';

// Guide-tone exercises (3rds and 7ths through the changes), drawn and played like Today's lick: the
// score and its playback bar, then the fretboard with the how-to beside it. The player exists only
// while its row is open.

import { useMemo, useState } from 'react';
import type { Standard } from '@/lib/music/types';
import { lineToAlphaTex } from '@/lib/music/alphatex.mjs';
import { prettyChord } from '@/lib/music/pretty';
import { PlayerProvider, type NoteHighlight } from '@/components/player/PlayerProvider';
import { PlayerScore, ScoreSheet } from '@/components/player/PlayerScore';
import { Transport } from '@/components/player/Transport';
import { Fretboard } from '@/components/player/Fretboard';
import { useRevealOpen } from '@/components/ui/Reveal';
import { Segmented } from '@/components/ui/Segmented';
import lessonStyles from '@/components/lesson/lesson.module.css';
import { Prose, lineContext } from '@/components/lesson/Prose';
import { curly, typeset } from '@/lib/text';
import styles from './standard.module.css';

type Exercise = Standard['guideToneExercises'][number];

/** "Bars 1–8" from a title such as "Guide tones in half notes, bars 1–8 (first A section)". */
function shortName(ex: Exercise, i: number) {
  const m = /bars?\s+(\d+)\s*[–-]\s*(\d+)/i.exec(ex.title);
  return m ? `${i + 1} · Bars ${m[1]}–${m[2]}` : `Exercise ${i + 1}`;
}

/** The exercise's changes bar by bar, as on the chart: | Gm7 C7 | Fm7 B♭7 |. */
function ExerciseChanges({ ex }: { ex: Exercise }) {
  const bars = ex.bars.map((_, i) => ex.chords.filter((c) => c.bar === i + 1));
  return (
    <p className={styles.exerciseChanges}>
      <span className="visually-hidden">Chords, bar by bar: </span>
      {bars.map((chords, i) => (
        <span key={i} className={styles.exerciseBar}>
          {chords.length ? (
            chords.map((c) => prettyChord(c.symbol)).join(' ')
          ) : (
            <>
              {/* A bar with no new chord repeats the last one, written with the simile mark. */}
              <span aria-hidden="true">%</span>
              <span className="visually-hidden">same chord</span>
            </>
          )}
          <span className="visually-hidden">{i < bars.length - 1 ? '; ' : ''}</span>
        </span>
      ))}
    </p>
  );
}

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
  // The player (and its Space key) exists only while the row it sits in is open.
  const shown = useRevealOpen();

  return (
    <div className={styles.guide}>
      {exercises.length > 1 ? (
        <div className={styles.guidePicker}>
          <Segmented label="Exercise" value={String(index)} options={exercises.map((e, i) => ({ value: String(i), label: shortName(e, i) }))} onChange={(v) => setIndex(Number(v))} />
        </div>
      ) : null}
      <div className={styles.guideHead}>
        <h3 className={styles.guideTitle}>{curly(ex.title)}</h3>
        <ExerciseChanges ex={ex} />
      </div>
      {shown ? (
        <PlayerProvider key={index} tex={tex} tempo={standard.tempo} label={`${ex.title}: standard notation and tablature${showAnalysis ? ' with chord degrees' : ''}`} highlights={highlights}>
          <div className={styles.guidePlayer}>
            <ScoreSheet>
              <PlayerScore />
              <Transport />
            </ScoreSheet>
            <div className={lessonStyles.fretRow}>
              <Fretboard bars={ex.bars} showAnalysis={showAnalysis} leftHanded={leftHanded} />
              {ex.description ? (
                <div className={styles.guideNote}>
                  <h4>How to play it</h4>
                  <Prose text={typeset(ex.description)} ctx={ctx} />
                </div>
              ) : null}
            </div>
          </div>
        </PlayerProvider>
      ) : null}
    </div>
  );
}
