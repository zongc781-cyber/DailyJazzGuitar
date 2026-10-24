'use client';

// A daily lick, one idea per screen: a blue first screen with the title and the chords, then the
// line itself to play (notation, tab, audio and fretboard), then big titles that open the details:
// why it works, the practice steps, where to use it, notes, the line as text, and the sources.
// Everything on screen comes from one transposed copy of the lesson JSON, so changing the key
// updates the notation, tab, audio, fretboard and analysis together.

import Link from 'next/link';
import { Activity, useId, useMemo, useState, type ReactNode } from 'react';
import type { Lick } from '@/lib/music/types';
import { lickToAlphaTex } from '@/lib/music/alphatex.mjs';
import { tonicsFor, transposeLick } from '@/lib/music/transpose.mjs';
import { prettyChord, prettyKey, prettyPitch } from '@/lib/music/pretty';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { markPracticeItem } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { PlayerProvider, type NoteHighlight } from '@/components/player/PlayerProvider';
import { PlayerScore, ScoreSheet } from '@/components/player/PlayerScore';
import { Transport } from '@/components/player/Transport';
import { Fretboard } from '@/components/player/Fretboard';
import { Hero, SectionHead } from '@/components/ui/Hero';
import { Icon } from '@/components/ui/Icon';
import { Reveal, RevealList } from '@/components/ui/Reveal';
import { Segmented } from '@/components/ui/Segmented';
import ui from '@/components/ui/ui.module.css';
import { LessonActions } from './LessonActions';
import { LessonBadges, Provenance } from './LessonBadges';
import { LickAnalysis } from './LickAnalysis';
import { NotesAsText } from './NotesAsText';
import { NotesField } from './NotesField';
import { PracticeChecklist, PracticeCount, type PracticeItem } from './PracticeChecklist';
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
    <div className={`${ui.field} ${styles.toolField}`}>
      <label htmlFor={id} className="visually-hidden">
        Key
      </label>
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
  back,
  standard,
  review,
  next,
}: {
  lesson: Lick;
  eyebrow: string;
  /** A link back to where the lesson was opened from, at the start of the label row. */
  back?: ReactNode;
  /** The standard this lick prepares, with where to open it. */
  standard?: { title: string; href: string } | null;
  review?: boolean;
  /** The end of the page: a link on to the next place. */
  next?: ReactNode;
}) {
  const dateKey = useLocalDate();
  const showByDefault = useProgress((s) => s.prefs.showAnalysis);
  const leftHanded = useProgress((s) => s.prefs.leftHanded);
  const hasNote = useProgress((s) => Boolean(s.notes[lesson.id]?.text.trim()));
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

  // The rows below the line are numbered on from "01 Play it"; not every lick has a practice task.
  const rows = ['why', 'practice', ...(current.practiceTask ? ['use-it'] : []), 'notes', 'as-text', 'credits'];
  const index = (id: string) => String(rows.indexOf(id) + 2).padStart(2, '0');

  return (
    <article className={styles.lesson}>
      <Hero
        top={
          <>
            <span className={styles.heroLabel}>
              {back}
              <span>{eyebrow}</span>
            </span>
            <LessonBadges lesson={lesson} review={review} />
          </>
        }
        title={lesson.title}
        actions={
          <>
            <a href="#play" className={`${ui.button} ${ui.onField} ${ui.large}`}>
              Start practising
              <Icon name="arrowDown" />
            </a>
            <LessonActions
              id={lesson.id}
              dateKey={dateKey}
              entry={{ kind: 'lick', title: lesson.title, origin: lesson.origin, artist: inspiration.artist, key: prettyKey(current.key) }}
            />
          </>
        }
      >
        <p className={styles.byline}>
          {byline}
          {standard ? (
            <>
              {', for '}
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
      </Hero>

      <section id="play" className={styles.play} aria-labelledby={`${analysisId}-play`}>
        <SectionHead index="01" id={`${analysisId}-play`}>
          Play it
        </SectionHead>

        <div className={styles.toolbar}>
          <KeySelect options={options} value={selected.tonic} written={lesson.key.tonic} mode={lesson.key.mode} onChange={setTonic} />
          <Segmented
            label="Lick or variation"
            value={part}
            options={[
              { value: 'lick', label: 'Lick' },
              { value: 'variation', label: 'Variation' },
            ]}
            onChange={setPart}
          />
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
            <h3>The variation</h3>
            <Prose text={current.variation.description} ctx={variationCtx} />
          </div>
        ) : null}

        <PlayerProvider tex={tex} tempo={lesson.tempo} label={label} highlights={highlights}>
          <section className={styles.player} aria-label="Notation and playback">
            <ScoreSheet>
              <PlayerScore />
              <Transport onPlayed={() => dateKey && markPracticeItem(dateKey, lesson.id, 'listen')} />
            </ScoreSheet>
            <div className={styles.fretRow}>
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
            </div>
          </section>
        </PlayerProvider>

        <Activity mode={showAnalysis ? 'visible' : 'hidden'}>
          <LickAnalysis lick={current} ctx={lickCtx} id={analysisId} />
        </Activity>
      </section>

      <RevealList className={styles.rows}>
        <Reveal id="why" index={index('why')} title="Why it works">
          <Prose text={current.whyItWorks} ctx={lickCtx} className={styles.lead} />
        </Reveal>
        <Reveal id="practice" index={index('practice')} title="Practice" meta={<PracticeCount lessonId={lesson.id} dateKey={dateKey} items={items} />}>
          <PracticeChecklist lessonId={lesson.id} dateKey={dateKey} items={items} />
        </Reveal>
        {current.practiceTask ? (
          <Reveal id="use-it" index={index('use-it')} title={standard ? `Use it on ${standard.title}` : 'Use it in a tune'}>
            <Prose text={current.practiceTask} ctx={lickCtx} className={styles.lead} />
          </Reveal>
        ) : null}
        <Reveal id="notes" index={index('notes')} title="Your notes" meta={hasNote ? 'Written' : null}>
          <NotesField lessonId={lesson.id} placeholder="What felt awkward? Which fingering worked? Where will you use it?" hideLabel />
        </Reveal>
        <Reveal id="as-text" index={index('as-text')} title="The notes as text">
          <NotesAsText bars={bars} chords={chords} timeSignature={lesson.timeSignature} bare />
        </Reveal>
        <Reveal id="credits" index={index('credits')} title="Sources and credits">
          <div className={styles.credits}>
            <InspirationNote inspiration={inspiration} />
            <SourceList sources={lesson.sources} />
            <Provenance lesson={lesson} />
          </div>
        </Reveal>
      </RevealList>

      {next}
    </article>
  );
}
