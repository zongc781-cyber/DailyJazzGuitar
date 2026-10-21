'use client';

// A daily lick: notation, tab, audio, fretboard, analysis, variation, practice and notes. Everything
// on screen comes from one transposed copy of the lesson JSON, so changing the key updates the
// notation, tab, audio, fretboard and analysis together.

import Link from 'next/link';
import { Activity, useId, useMemo, useState } from 'react';
import type { Lick } from '@/lib/music/types';
import { lickToAlphaTex } from '@/lib/music/alphatex.mjs';
import { tonicsFor, transposeLick } from '@/lib/music/transpose.mjs';
import { prettyChord, prettyKey, prettyPitch } from '@/lib/music/pretty';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { markPracticeItem } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { PlayerProvider, type NoteHighlight } from '@/components/player/PlayerProvider';
import { PlayerScore } from '@/components/player/PlayerScore';
import { Transport } from '@/components/player/Transport';
import { Fretboard } from '@/components/player/Fretboard';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import ui from '@/components/ui/ui.module.css';
import { LessonActions } from './LessonActions';
import { LessonBadges, Provenance } from './LessonBadges';
import { LickAnalysis } from './LickAnalysis';
import { NotesAsText } from './NotesAsText';
import { NotesField } from './NotesField';
import { PracticeChecklist, type PracticeItem } from './PracticeChecklist';
import { Prose, lineContext } from './Prose';
import { InspirationNote, SourceList } from './SourceList';
import styles from './lesson.module.css';

type Part = 'lick' | 'variation';

interface KeyOption {
  tonic: string;
  lesson: Lick | null;
  shift: number;
}

function KeySelect({ options, value, written, mode, onChange }: { options: KeyOption[]; value: string; written: string; mode: string; onChange: (tonic: string) => void }) {
  const id = useId();
  return (
    <div className={ui.field}>
      <label htmlFor={id}>Key</label>
      <select id={id} className={ui.select} value={value} onChange={(e) => onChange(e.target.value)} data-testid="key-select">
        {options.map((k) => (
          <option key={k.tonic} value={k.tonic} disabled={!k.lesson}>
            {`${prettyPitch(k.tonic)} ${mode}${k.tonic === written ? ' (as written)' : ''}${k.lesson ? '' : ' (out of range)'}`}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Everything the lesson shows for the chosen key, line and analysis setting. Transposition runs
 * once per lesson; the alphaTex, highlights and prose contexts follow the selection.
 */
function useLickView(lesson: Lick, tonic: string, part: Part, showAnalysis: boolean) {
  // Every key the lick can be played in without leaving the neck.
  const options = useMemo<KeyOption[]>(() => {
    const tonics = tonicsFor(lesson.key.mode);
    const list = tonics.includes(lesson.key.tonic) ? tonics : [lesson.key.tonic, ...tonics];
    return list.map((t) => {
      if (t === lesson.key.tonic) return { tonic: t, lesson, shift: 0 };
      const r = transposeLick(lesson, t);
      return { tonic: t, lesson: r.lesson ?? null, shift: r.shift ?? 0 };
    });
  }, [lesson]);
  const selected = options.find((k) => k.tonic === tonic && k.lesson) ?? options.find((k) => k.tonic === lesson.key.tonic)!;
  const current = selected.lesson ?? lesson;
  const isVariation = part === 'variation';
  const bars = isVariation ? current.variation.bars : current.bars;
  const chords = isVariation ? (current.variation.chords ?? current.chords) : current.chords;
  const [resBar, resEvent] = current.analysis.resolution.note;

  const tex = useMemo(() => lickToAlphaTex(current, { variation: isVariation, labels: showAnalysis ? 'degrees' : null }), [current, isVariation, showAnalysis]);
  const highlights = useMemo<NoteHighlight[][] | null>(
    () =>
      showAnalysis
        ? bars.map((bar, bi) =>
            bar.events.map((ev, ei) => ({
              role: ev.rest ? null : (ev.role ?? null),
              resolution: !isVariation && bi + 1 === resBar && ei + 1 === resEvent,
            })),
          )
        : null,
    [bars, showAnalysis, isVariation, resBar, resEvent],
  );
  const lickCtx = useMemo(() => lineContext(current.bars, current.chords, current.key), [current]);
  const variationCtx = useMemo(() => lineContext(current.variation.bars, current.variation.chords ?? current.chords, current.key), [current]);
  return { options, selected, current, isVariation, bars, chords, tex, highlights, lickCtx, variationCtx };
}

export function LickLesson({
  lesson,
  eyebrow,
  standard,
  review,
}: {
  lesson: Lick;
  eyebrow: string;
  /** The standard this lick prepares, with where to open it. */
  standard?: { title: string; href: string } | null;
  review?: boolean;
}) {
  const dateKey = useLocalDate();
  const showByDefault = useProgress((s) => s.prefs.showAnalysis);
  const leftHanded = useProgress((s) => s.prefs.leftHanded);
  const [tonic, setTonic] = useState(lesson.key.tonic);
  const [part, setPart] = useState<Part>('lick');
  const [analysisChoice, setAnalysisChoice] = useState<boolean | null>(null);
  const showAnalysis = analysisChoice ?? showByDefault;
  const analysisId = useId();

  const { options, selected, current, isVariation, bars, chords, tex, highlights, lickCtx, variationCtx } = useLickView(lesson, tonic, part, showAnalysis);

  const feel = lesson.feel === 'swing' ? 'swinging the eighths' : 'with even, straight eighths';
  const items: PracticeItem[] = [
    { id: 'listen', label: 'Listen to it at the target tempo', hint: 'Ticks itself when you press play.' },
    { id: 'slow', label: 'Play along at the Slow tempo with the count-in on' },
    { id: 'memory', label: 'Play it from memory, then check it against the tab' },
    { id: 'target', label: `Play it cleanly at the Target tempo, ${feel}` },
    { id: 'variation', label: 'Learn the variation' },
    { id: 'transpose', label: 'Play it in a second key from the Key menu' },
    ...(lesson.practiceTask ? [{ id: 'apply', label: standard ? `Do the practice task over ${standard.title}` : 'Do the practice task' }] : []),
  ];

  const { inspiration } = lesson;
  const byline = inspiration.type === 'in-the-style-of' && inspiration.artist ? `In the style of ${inspiration.artist}` : inspiration.artist ? `After ${inspiration.artist}` : 'Original line';
  const shiftNote =
    selected.tonic !== lesson.key.tonic && selected.shift !== 0
      ? `Same fingering, moved ${Math.abs(selected.shift)} fret${Math.abs(selected.shift) === 1 ? '' : 's'} ${selected.shift > 0 ? 'up' : 'down'} the neck.`
      : null;
  const label = `${isVariation ? 'Variation' : 'Lick'} in ${prettyKey(current.key)}, ${bars.length} bars, standard notation and tablature${showAnalysis ? ' with chord degrees' : ''}`;

  return (
    <article className={styles.lesson}>
      <header className={styles.header}>
        <p className={ui.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{lesson.title}</h1>
        <p className={styles.byline}>
          {byline}
          {standard ? (
            <>
              {' · for '}
              <Link href={standard.href}>{standard.title}</Link>
            </>
          ) : null}
        </p>
        <p className={styles.progression} data-testid="chords">
          <span className="visually-hidden">Chords: </span>
          {current.chords.map((c, i) => (
            <span key={i} className={styles.progressionChord}>
              {prettyChord(c.symbol)}
            </span>
          ))}
        </p>
        <LessonBadges lesson={lesson} review={review} />
        <LessonActions
          id={lesson.id}
          dateKey={dateKey}
          entry={{ kind: 'lick', title: lesson.title, origin: lesson.origin, artist: inspiration.artist, key: prettyKey(current.key) }}
        />
      </header>

      <div className={styles.toolbar}>
        <KeySelect options={options} value={selected.tonic} written={lesson.key.tonic} mode={lesson.key.mode} onChange={setTonic} />
        <div className={ui.field}>
          <span aria-hidden="true">Line</span>
          <Segmented
            label="Line"
            value={part}
            options={[
              { value: 'lick', label: 'Lick' },
              { value: 'variation', label: 'Variation' },
            ]}
            onChange={setPart}
          />
        </div>
        <button
          type="button"
          className={`${ui.button} ${styles.analysisToggle}`}
          aria-expanded={showAnalysis}
          aria-controls={analysisId}
          onClick={() => setAnalysisChoice(!showAnalysis)}
          data-testid="analysis-toggle"
        >
          <Icon name={showAnalysis ? 'eyeOff' : 'eye'} />
          {showAnalysis ? 'Hide analysis' : 'Show analysis'}
        </button>
      </div>
      {shiftNote ? <p className={styles.shiftNote}>{shiftNote}</p> : null}

      {isVariation ? (
        <div className={styles.variationNote}>
          <h2>Variation</h2>
          <Prose text={current.variation.description} ctx={variationCtx} />
        </div>
      ) : null}

      <PlayerProvider tex={tex} tempo={lesson.tempo} label={label} highlights={highlights}>
        <section className={styles.player} aria-label="Notation and playback">
          <PlayerScore />
          <Transport onPlayed={() => dateKey && markPracticeItem(dateKey, lesson.id, 'listen')} />
          <Fretboard bars={bars} showAnalysis={showAnalysis} leftHanded={leftHanded} resolution={isVariation ? undefined : current.analysis.resolution.note} />
          {current.fingeringNote ? (
            <div className={styles.fingering}>
              <h3>Fingering</h3>
              <Prose text={current.fingeringNote} ctx={lickCtx} />
              {selected.tonic !== lesson.key.tonic ? (
                <p className={styles.fingeringKey}>Any fret numbers in this note are for the written key, {prettyKey(lesson.key)}.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </PlayerProvider>

      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section className={styles.why} aria-labelledby={`${analysisId}-why`}>
            <h2 id={`${analysisId}-why`}>Why this works</h2>
            <Prose text={current.whyItWorks} ctx={lickCtx} />
          </section>
          <Activity mode={showAnalysis ? 'visible' : 'hidden'}>
            <LickAnalysis lick={current} ctx={lickCtx} id={analysisId} />
          </Activity>
          {showAnalysis ? null : (
            <p className={styles.analysisHint}>
              The analysis is hidden so you can work the line out first. Press <strong>Show analysis</strong> to see the chord tones, extensions, approach
              notes, rhythmic placement and resolution, with each note coloured on the score and fretboard.
            </p>
          )}
        </div>
        <aside className={styles.sideColumn} aria-label="Practice">
          {current.practiceTask ? (
            <section className={styles.task}>
              <h2>{standard ? `Use it on ${standard.title}` : 'Practice task'}</h2>
              <Prose text={current.practiceTask} ctx={lickCtx} />
            </section>
          ) : null}
          <PracticeChecklist lessonId={lesson.id} dateKey={dateKey} items={items} />
          <NotesField lessonId={lesson.id} placeholder="What felt awkward? Which fingering worked? Where will you use it?" />
        </aside>
      </div>

      <NotesAsText bars={bars} chords={chords} timeSignature={lesson.timeSignature} />

      <footer className={styles.credits}>
        <h2>Sources and credits</h2>
        <InspirationNote inspiration={inspiration} />
        <SourceList sources={lesson.sources} />
        <Provenance lesson={lesson} />
      </footer>
    </article>
  );
}
