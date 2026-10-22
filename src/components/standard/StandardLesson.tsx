'use client';

// The weekly standard, set out like a lead sheet: a title block with the feel at the left and the
// composer at the right over a staff, then sections marked with rehearsal letters in order: today's
// practice, listening, the chord chart, voicings, guide tones, improvisation ideas, the seven-day
// plan and the week's licks. Each section takes its own shape (a featured card, track lists, a
// chart, a picker, a score sheet, numbered notes, a timeline) from the same tokens and parts.

import Link from 'next/link';
import { Activity, useId, useMemo, useState, type ReactNode } from 'react';
import type { Inspiration, PlanDay, Standard } from '@/lib/music/types';
import { prettyKey } from '@/lib/music/pretty';
import { formatDate } from '@/lib/format';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { useProgress } from '@/lib/progress/store';
import { Icon } from '@/components/ui/Icon';
import { Pencil, RehearsalHeading } from '@/components/ui/Pencil';
import ui from '@/components/ui/ui.module.css';
import lessonStyles from '@/components/lesson/lesson.module.css';
import { LessonActions } from '@/components/lesson/LessonActions';
import { LessonBadges, Provenance } from '@/components/lesson/LessonBadges';
import { NotesField } from '@/components/lesson/NotesField';
import { Prose, type ProseContext } from '@/components/lesson/Prose';
import { SourceList } from '@/components/lesson/SourceList';
import { ChordChart } from './ChordChart';
import { GuideTones } from './GuideTones';
import { HarmonicAnalysis } from './HarmonicAnalysis';
import { PracticePlan, TodayPractice, type DayAction, type PlanLick } from './PracticePlan';
import { Voicings } from './Voicings';
import { count, curly, listJoin, typeset } from './text';
import styles from './standard.module.css';

export interface WeekLick extends PlanLick {
  artist?: string;
  /** How the lick relates to the artist; "in the style of" when not given. */
  inspirationType?: Inspiration['type'];
  /** "today", "done" (assigned on an earlier day), or "upcoming". */
  status?: 'today' | 'done' | 'upcoming';
}

type SectionKey = 'today' | 'listen' | 'chart' | 'voicings' | 'guide-tones' | 'ideas' | 'plan' | 'licks';

const SECTIONS: Record<SectionKey, { title: string; short: string }> = {
  today: { title: 'Today’s practice', short: 'Today' },
  listen: { title: 'Listen', short: 'Listen' },
  chart: { title: 'Chord chart', short: 'Chart' },
  voicings: { title: 'Voicings', short: 'Voicings' },
  'guide-tones': { title: 'Guide-tone exercises', short: 'Guide tones' },
  ideas: { title: 'Improvisation ideas', short: 'Ideas' },
  plan: { title: 'Seven-day plan', short: 'Plan' },
  licks: { title: 'Licks for this tune', short: 'Licks' },
};

interface Mark {
  id: SectionKey;
  letter: string;
  title: string;
  short: string;
}

/** A section with its boxed rehearsal letter. "split" sets the heading beside the content. */
function Section({ mark, intro, aside, layout = 'stack', children }: { mark: Mark; intro?: ReactNode; aside?: ReactNode; layout?: 'stack' | 'split'; children: ReactNode }) {
  return (
    <section className={layout === 'split' ? styles.split : styles.section} aria-labelledby={mark.id}>
      <div className={styles.sectionHead}>
        <div className={styles.headingRow}>
          <RehearsalHeading letter={mark.letter} id={mark.id}>
            {mark.title}
          </RehearsalHeading>
          {aside}
        </div>
        {intro ? <p className={styles.intro}>{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** The page's road map: every rehearsal letter, as links down the page. */
function RoadMap({ marks }: { marks: Mark[] }) {
  return (
    <nav className={styles.roadmap} aria-label="Sections on this page">
      <ol>
        {marks.map((m) => (
          <li key={m.id}>
            <a href={`#${m.id}`}>
              <span className={styles.roadmapMark} aria-hidden="true">
                {m.letter}
              </span>
              {m.short}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** A quarter note, for the tempo marking: ♩ = 120. */
function QuarterNote() {
  return (
    <svg className={styles.quarter} viewBox="0 0 12 26" aria-hidden="true" focusable="false">
      <ellipse cx="5" cy="21" rx="4.6" ry="3.3" transform="rotate(-22 5 21)" fill="currentColor" />
      <path d="M9.1 20V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Where today's work happens on this page (or the day's lick), for the one primary button. */
function dayAction(day: PlanDay, lick: PlanLick | undefined, has: (k: SectionKey) => boolean): DayAction {
  const go = (key: SectionKey, label: string): DayAction => ({ href: `#${key}`, label, icon: 'chevronDown' });
  switch (day.focus) {
    case 'listening':
      return has('listen') ? go('listen', 'Start with the recordings') : go('chart', 'Open the chord chart');
    case 'comping':
      return has('voicings') ? go('voicings', 'Open the voicings') : go('chart', 'Open the chord chart');
    case 'vocabulary':
      if (lick) return { href: lick.href, label: 'Open the day’s lick', icon: 'chevronRight' };
      return has('licks') ? go('licks', 'See this week’s licks') : go('chart', 'Open the chord chart');
    case 'improvisation':
      return has('ideas') ? go('ideas', 'Read the improvisation ideas') : go('chart', 'Open the chord chart');
    case 'self-review':
      return { href: '#notes', label: 'Write your review', icon: 'chevronDown' };
    default:
      return go('chart', 'Open the chord chart');
  }
}

function lickByline(l: WeekLick) {
  if (!l.artist) return null;
  return !l.inspirationType || l.inspirationType === 'in-the-style-of' ? `In the style of ${l.artist}` : `After ${l.artist}`;
}

export function StandardLesson({
  standard,
  eyebrow,
  aside,
  weekKey,
  todayDay,
  licks,
  review,
}: {
  standard: Standard;
  eyebrow: string;
  /** Shown at the right of the label row, e.g. a link to today's lick. */
  aside?: ReactNode;
  /** ISO week the plan ticks belong to. */
  weekKey: string | null;
  /** Today's day of the plan when this is the current week's standard. */
  todayDay: number | null;
  licks: WeekLick[];
  review?: boolean;
}) {
  const dateKey = useLocalDate();
  const showByDefault = useProgress((s) => s.prefs.showAnalysis);
  const leftHanded = useProgress((s) => s.prefs.leftHanded);
  const [analysisChoice, setAnalysisChoice] = useState<boolean | null>(null);
  const showAnalysis = analysisChoice ?? showByDefault;
  const analysisId = useId();

  const chartCtx = useMemo<ProseContext>(() => {
    const flat = standard.chart.flatMap((bar) => bar.chords);
    return { note: () => null, chord: (n) => flat[n - 1]?.symbol ?? null, keyName: prettyKey(standard.key) };
  }, [standard]);
  const lickMap = useMemo(() => new Map(licks.map((l) => [l.id, l])), [licks]);
  const today = todayDay ? standard.practicePlan.find((d) => d.day === todayDay) : undefined;
  const todayLick = today?.lickId ? lickMap.get(today.lickId) : undefined;

  // Sections run A, B, C… in order; a section with nothing to show is left out and the letters close up.
  const present: Record<SectionKey, boolean> = {
    today: Boolean(today),
    listen: standard.listening.length > 0,
    chart: true,
    voicings: standard.voicings.length > 0,
    'guide-tones': standard.guideToneExercises.length > 0,
    ideas: standard.improvisation.length > 0,
    plan: standard.practicePlan.length > 0,
    licks: licks.length > 0,
  };
  const marks: Mark[] = (Object.keys(SECTIONS) as SectionKey[])
    .filter((k) => present[k])
    .map((k, i) => ({ id: k, letter: String.fromCharCode(65 + i), ...SECTIONS[k] }));
  const mark = (k: SectionKey) => marks.find((m) => m.id === k)!;

  const centres = [...new Set(standard.keyCenters.map((c) => prettyKey(c)))];
  const [beats, unit] = standard.timeSignature;
  const minutes = standard.practicePlan.map((d) => d.minutes);
  const [fewest, most] = [Math.min(...minutes), Math.max(...minutes)];
  const voicedChords = new Set(standard.voicings.map((v) => v.symbol)).size;

  return (
    <article className={styles.week}>
      <header className={styles.head}>
        <div className={lessonStyles.eyebrowRow}>
          <p className={ui.eyebrow}>{eyebrow}</p>
          {aside}
        </div>
        <h1 className={lessonStyles.title}>{standard.title}</h1>
        {/* The head of a lead sheet: the feel at the left, the composer at the right, then the staff. */}
        <div className={styles.chartHead}>
          <p className={styles.feel}>
            {standard.feel === 'swing' ? 'Swing' : 'Straight eighths'}
            <span className={styles.tempoMark} aria-hidden="true">
              <QuarterNote /> = {standard.tempo.default}
            </span>
            <span className="visually-hidden">, around {standard.tempo.default} beats per minute</span>
          </p>
          <p className={styles.composer}>
            {listJoin(standard.composers)}, {standard.year}
          </p>
        </div>
        <div className={`${ui.staffRule} ${styles.headStaff}`} aria-hidden="true" />
        <div className={styles.metaRow}>
          <div className={styles.metaFacts}>
            <dl className={styles.facts}>
              <div>
                <dt>Form</dt>
                <dd>
                  {standard.form.label}, {standard.chart.length} bars
                </dd>
              </div>
              <div>
                <dt>{centres.length === 1 ? 'Key' : 'Key centres'}</dt>
                <dd>{listJoin(centres)}</dd>
              </div>
            </dl>
            <LessonBadges lesson={standard} review={review} />
          </div>
          <LessonActions id={standard.id} dateKey={dateKey} entry={{ kind: 'standard', title: standard.title, origin: standard.origin }} />
        </div>
        <RoadMap marks={marks} />
      </header>

      {today ? (
        <Section mark={mark('today')}>
          <TodayPractice
            standardId={standard.id}
            day={today}
            weekKey={weekKey}
            ctx={chartCtx}
            lick={todayLick}
            action={dayAction(today, todayLick, (k) => present[k])}
            next={standard.practicePlan.find((d) => d.day === today.day + 1)}
          />
        </Section>
      ) : null}

      {present.listen ? (
        <Section
          mark={mark('listen')}
          layout="split"
          intro={`${count(standard.listening.length, 'recording')} to know. Put the chord chart in front of you and count the bars as they go by; each note says what to listen for.`}
        >
          <ol className={styles.tracks}>
            {standard.listening.map((l, i) => (
              <li key={i} className={styles.track}>
                <span className={styles.trackNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <div className={styles.trackMain}>
                  <p className={styles.trackArtist}>{curly(l.performer)}</p>
                  <p className={styles.trackAlbum}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      {curly(l.album ?? l.recording)}
                      <Icon name="external" size={15} className={styles.trackOut} />
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                    {l.album && l.recording !== standard.title ? <span className={styles.trackRecording}> · {curly(l.recording)}</span> : null}
                  </p>
                  {l.note ? <p className={styles.trackNote}>{typeset(l.note)}</p> : null}
                  <p className={styles.trackChecked}>Link checked {formatDate(l.verifiedOn)}</p>
                </div>
                <span className={`${styles.trackYear} num`}>{l.year}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <Section
        mark={mark('chart')}
        intro={`${standard.form.label} form: ${standard.chart.length} bars of ${beats}/${unit}. Each slash is a beat, and a chord lasts until the next one is written.`}
        aside={
          <button
            type="button"
            className={`${ui.button} ${lessonStyles.analysisToggle}`}
            aria-expanded={showAnalysis}
            aria-controls={analysisId}
            onClick={() => setAnalysisChoice(!showAnalysis)}
            data-testid="analysis-toggle"
          >
            <Icon name={showAnalysis ? 'eyeOff' : 'eye'} />
            {showAnalysis ? 'Hide analysis' : 'Show analysis'}
          </button>
        }
      >
        <ChordChart standard={standard} showAnalysis={showAnalysis} />
        {standard.simplified && standard.simplificationNote ? (
          <p className={styles.footnote}>
            <Icon name="info" size={18} />
            <span>
              <strong>One version of the changes.</strong> {typeset(standard.simplificationNote)}
            </span>
          </p>
        ) : null}
        {showAnalysis ? null : (
          <p className={lessonStyles.analysisHint}>
            The analysis is hidden so you can hear and name the changes yourself first. Show it to write the roman numerals under the chords, shade each
            key centre and read how the form works
            {standard.analysis.variations.length ? `, with ${count(standard.analysis.variations.length, 'common variation')}` : ''}.
          </p>
        )}
        <Activity mode={showAnalysis ? 'visible' : 'hidden'}>
          <HarmonicAnalysis standard={standard} ctx={chartCtx} id={analysisId} />
        </Activity>
      </Section>

      {present.voicings ? (
        <Section
          mark={mark('voicings')}
          intro={`${count(standard.voicings.length, 'shape')} for ${count(voicedChords, 'chord')}, for comping through the form. Choose a chord to see its shapes, where it comes in the chart and where each shape leads.`}
        >
          <Voicings standard={standard} showAnalysis={showAnalysis} leftHanded={leftHanded} />
        </Section>
      ) : null}

      {present['guide-tones'] ? (
        <Section
          mark={mark('guide-tones')}
          intro="The 3rd and 7th of each chord name its sound, and they move by step from one chord to the next. Loop an exercise at the Slow tempo and sing along before you play it."
        >
          <GuideTones standard={standard} showAnalysis={showAnalysis} leftHanded={leftHanded} />
        </Section>
      ) : null}

      {present.ideas ? (
        <Section mark={mark('ideas')} intro={`${count(standard.improvisation.length, 'way')} into a solo on these changes. Take one per chorus rather than all at once.`}>
          <ol className={styles.ideas}>
            {standard.improvisation.map((idea, i) => (
              <li key={i} className={styles.idea}>
                <span className={styles.ideaNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <div className={styles.ideaBody}>
                  <h3>{curly(idea.title)}</h3>
                  <Prose text={typeset(idea.text)} ctx={chartCtx} />
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {present.plan ? (
        <Section
          mark={mark('plan')}
          intro={`${count(standard.practicePlan.length, 'session')} of ${fewest === most ? fewest : `${fewest} to ${most}`} minutes. Tick each task as you finish it; your ticks are saved in this browser for this week.`}
        >
          <PracticePlan standard={standard} weekKey={weekKey} todayDay={todayDay} ctx={chartCtx} licks={lickMap} />
        </Section>
      ) : null}

      {present.licks ? (
        <Section
          mark={mark('licks')}
          intro="One lick a day, each written over a passage of these changes. Open one to read it in notation and tab, hear it and loop it."
        >
          <ol className={styles.setlist}>
            {licks.map((l, i) => (
              <li key={l.id}>
                <Link href={l.href} className={styles.setRow}>
                  <span className={`${styles.setNumber} num`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className={styles.setTitle}>{curly(l.title)}</span>
                  {l.artist ? <span className={styles.setArtist}>{lickByline(l)}</span> : <span />}
                  <span className={styles.setStatus}>
                    {l.status === 'today' ? (
                      <span className={styles.setToday}>
                        Today’s lick
                        <Pencil kind="underline" className={styles.setUnderline} />
                      </span>
                    ) : l.status === 'done' ? (
                      <span className={styles.setPlayed}>
                        <Pencil kind="tick" className={styles.setTick} />
                        Played
                      </span>
                    ) : null}
                  </span>
                  <Icon name="chevronRight" size={18} />
                </Link>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <div id="notes" className={styles.notes}>
        <NotesField lessonId={standard.id} placeholder="Which recording grabbed you? Which voicings sit well? What will you fix next week?" />
      </div>

      <footer className={lessonStyles.credits}>
        <h2>Sources and credits</h2>
        <p>
          The chord changes, analysis, voicings and exercises on this page are written for this app. The melody and lyrics are not reproduced: learn the
          melody by ear from the recordings above.
        </p>
        <SourceList sources={standard.sources} />
        <Provenance lesson={standard} />
      </footer>
    </article>
  );
}
