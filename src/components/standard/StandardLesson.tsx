'use client';

// The weekly standard, one idea per screen: a blue first screen with the tune, who wrote it, its feel
// and today's focus, and one action for the day. The parts used every day stay open (today's tasks
// and the chord chart); the rest sit under big titles that open: listening, voicings, guide tones,
// improvisation ideas, the seven-day plan, the week's licks, notes and sources. The page ends on a
// link to the next place.

import Link from 'next/link';
import { Activity, useId, useMemo, useState, type ReactNode } from 'react';
import type { Inspiration, PlanDay, Standard } from '@/lib/music/types';
import { prettyKey } from '@/lib/music/pretty';
import { formatDate } from '@/lib/format';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { useProgress } from '@/lib/progress/store';
import { Hero, SectionHead } from '@/components/ui/Hero';
import { Icon } from '@/components/ui/Icon';
import { Reveal, RevealList } from '@/components/ui/Reveal';
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
import { FOCUS_LABEL, PlanCount, PracticePlan, TodayPractice, type DayAction, type PlanLick } from './PracticePlan';
import { Voicings } from './Voicings';
import { count, curly, listJoin, typeset } from '@/lib/text';
import styles from './standard.module.css';

export interface WeekLick extends PlanLick {
  artist?: string;
  /** How the lick relates to the artist; "in the style of" when not given. */
  inspirationType?: Inspiration['type'];
  /** "today", "done" (assigned on an earlier day), or "upcoming". */
  status?: 'today' | 'done' | 'upcoming';
}

/** The rows under the open sections, in order. Their ids are where the first screen's button leads. */
type RowKey = 'listen' | 'voicings' | 'guide-tones' | 'ideas' | 'plan' | 'licks' | 'notes' | 'credits';
const ROWS: RowKey[] = ['listen', 'voicings', 'guide-tones', 'ideas', 'plan', 'licks', 'notes', 'credits'];

/** A quarter note, for the tempo marking: ♩ = 120. */
function QuarterNote() {
  return (
    <svg className={styles.quarter} viewBox="0 0 12 26" aria-hidden="true" focusable="false">
      <ellipse cx="5" cy="21" rx="4.6" ry="3.3" transform="rotate(-22 5 21)" fill="currentColor" />
      <path d="M9.1 20V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Where today's work happens on this page (or the day's lick), for the one button on the first screen. */
function dayAction(day: PlanDay, lick: PlanLick | undefined, has: (k: RowKey) => boolean): DayAction {
  const go = (key: RowKey | 'chart', label: string): DayAction => ({ href: `#${key}`, label, icon: 'arrowDown' });
  switch (day.focus) {
    case 'listening':
      return has('listen') ? go('listen', 'Start with the recordings') : go('chart', 'Open the chord chart');
    case 'comping':
      return has('voicings') ? go('voicings', 'Open the voicings') : go('chart', 'Open the chord chart');
    case 'vocabulary':
      if (lick) return { href: lick.href, label: 'Open the day’s lick', icon: 'arrowRight' };
      return has('licks') ? go('licks', 'See this week’s licks') : go('chart', 'Open the chord chart');
    case 'improvisation':
      return has('ideas') ? go('ideas', 'Read the improvisation ideas') : go('chart', 'Open the chord chart');
    case 'self-review':
      return { href: '#notes', label: 'Write your review', icon: 'arrowDown' };
    default:
      return go('chart', 'Open the chord chart');
  }
}

/** The first screen's button: down the page to a row or the chart, or on to the day's lick. */
function ActionLink({ action }: { action: DayAction }) {
  const inPage = action.href.startsWith('#');
  const className = `${ui.button} ${ui.onField} ${ui.large}`;
  const body = (
    <>
      {action.label}
      <Icon name={action.icon} />
    </>
  );
  return inPage ? (
    <a href={action.href} className={className}>
      {body}
    </a>
  ) : (
    <Link href={action.href} className={className}>
      {body}
    </Link>
  );
}

function lickByline(l: WeekLick) {
  if (!l.artist) return null;
  return !l.inspirationType || l.inspirationType === 'in-the-style-of' ? `In the style of ${l.artist}` : `After ${l.artist}`;
}

export function StandardLesson({
  standard,
  eyebrow,
  back,
  weekKey,
  todayDay,
  licks,
  next,
}: {
  standard: Standard;
  eyebrow: string;
  /** A link back to where the standard was opened from, at the start of the label row. */
  back?: ReactNode;
  /** ISO week the plan ticks belong to. */
  weekKey: string | null;
  /** Today's day of the plan when this is the current week's standard. */
  todayDay: number | null;
  licks: WeekLick[];
  /** The end of the page: a link on to the next place. */
  next?: ReactNode;
}) {
  const dateKey = useLocalDate();
  const showByDefault = useProgress((s) => s.prefs.showAnalysis);
  const leftHanded = useProgress((s) => s.prefs.leftHanded);
  const hasNote = useProgress((s) => Boolean(s.notes[standard.id]?.text.trim()));
  const [analysisChoice, setAnalysisChoice] = useState<boolean | null>(null);
  const showAnalysis = analysisChoice ?? showByDefault;
  const uid = useId();
  const analysisId = `${uid}-analysis`;

  const chartCtx = useMemo<ProseContext>(() => {
    const flat = standard.chart.flatMap((bar) => bar.chords);
    return { note: () => null, chord: (n) => flat[n - 1]?.symbol ?? null, keyName: prettyKey(standard.key) };
  }, [standard]);
  const lickMap = useMemo(() => new Map(licks.map((l) => [l.id, l])), [licks]);
  const today = todayDay ? standard.practicePlan.find((d) => d.day === todayDay) : undefined;
  const todayLick = today?.lickId ? lickMap.get(today.lickId) : undefined;

  // A row with nothing to show is left out, and the numbers close up. They run on from the open
  // sections: 01 Today and 02 The chart on This Week, 01 The chart from the library.
  const present: Record<RowKey, boolean> = {
    listen: standard.listening.length > 0,
    voicings: standard.voicings.length > 0,
    'guide-tones': standard.guideToneExercises.length > 0,
    ideas: standard.improvisation.length > 0,
    plan: standard.practicePlan.length > 0,
    licks: licks.length > 0,
    notes: true,
    credits: true,
  };
  const rows = ROWS.filter((k) => present[k]);
  const opened = today ? 2 : 1;
  const index = (k: RowKey) => String(rows.indexOf(k) + opened + 1).padStart(2, '0');

  const centres = [...new Set(standard.keyCenters.map((c) => prettyKey(c)))];
  const [beats, unit] = standard.timeSignature;
  const action: DayAction = today ? dayAction(today, todayLick, (k) => present[k]) : { href: '#chart', label: 'Open the chord chart', icon: 'arrowDown' };

  return (
    <article className={styles.week}>
      <Hero
        top={
          <>
            <span className={lessonStyles.heroLabel}>
              {back}
              <span>{eyebrow}</span>
            </span>
            <LessonBadges lesson={standard} />
          </>
        }
        title={standard.title}
        actions={
          <>
            <ActionLink action={action} />
            <LessonActions id={standard.id} dateKey={dateKey} entry={{ kind: 'standard', title: standard.title, origin: standard.origin }} />
          </>
        }
      >
        <p className={lessonStyles.byline}>
          {listJoin(standard.composers)}, {standard.year} · {standard.feel === 'swing' ? 'Swing' : 'Straight eighths'},{' '}
          <span className={styles.tempoMark} aria-hidden="true">
            <QuarterNote /> = {standard.tempo.default}
          </span>
          <span className="visually-hidden">around {standard.tempo.default} beats per minute</span>
        </p>
        <p className={styles.heroFocus}>
          {today
            ? `Today: ${FOCUS_LABEL[today.focus].toLowerCase()}, ${today.minutes} minutes`
            : `${standard.form.label} form, ${standard.chart.length} bars, in ${listJoin(centres)}`}
        </p>
      </Hero>

      {today ? (
        <section id="today" className={styles.section} aria-labelledby={`${uid}-today`}>
          <SectionHead index="01" id={`${uid}-today`}>
            Today
          </SectionHead>
          <TodayPractice
            standardId={standard.id}
            day={today}
            weekKey={weekKey}
            ctx={chartCtx}
            lick={todayLick}
            next={standard.practicePlan.find((d) => d.day === today.day + 1)}
          />
        </section>
      ) : null}

      <section id="chart" className={styles.section} aria-labelledby={`${uid}-chart`}>
        <SectionHead index={today ? '02' : '01'} id={`${uid}-chart`}>
          The chart
        </SectionHead>
        <div className={styles.toolbar}>
          <dl className={styles.facts}>
            <div>
              <dt>Form</dt>
              <dd>
                {standard.form.label}, {standard.chart.length} bars of {beats}/{unit}
              </dd>
            </div>
            <div>
              <dt>{centres.length === 1 ? 'Key' : 'Key centres'}</dt>
              <dd>{listJoin(centres)}</dd>
            </div>
          </dl>
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
        </div>
        <ChordChart standard={standard} showAnalysis={showAnalysis} />
        <div className={styles.chartNotes}>
          <p>
            Each slash is a beat, and a chord lasts until the next one is written.
            {standard.simplified ? (
              <>
                {' '}
                This is one version of the changes; lead sheets and recordings differ (see <a href="#credits">Sources and credits</a>).
              </>
            ) : null}
          </p>
          {showAnalysis ? null : (
            <p>
              The analysis stays hidden so you can name the changes yourself first. Show it for the roman numerals, the key centres and how the form
              works{standard.analysis.variations.length ? `, with ${count(standard.analysis.variations.length, 'common variation')}` : ''}.
            </p>
          )}
        </div>
        <Activity mode={showAnalysis ? 'visible' : 'hidden'}>
          <HarmonicAnalysis standard={standard} ctx={chartCtx} id={analysisId} />
        </Activity>
      </section>

      <RevealList className={lessonStyles.rows}>
        {present.listen ? (
          <Reveal id="listen" index={index('listen')} title="Listen">
            <div className={styles.rowBody}>
              <p className={styles.rowIntro}>Put the chord chart in front of you and count the bars as they go by. Each note says what to listen for.</p>
              <ol className={styles.tracks}>
                {standard.listening.map((l, i) => (
                  <li key={i} className={styles.track}>
                    <div className={styles.trackMain}>
                      <p className={styles.trackArtist}>{curly(l.performer)}</p>
                      <p className={styles.trackAlbum}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer">
                          {curly(l.album ?? l.recording)}
                          <Icon name="external" size={16} className={styles.trackOut} />
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
            </div>
          </Reveal>
        ) : null}

        {present.voicings ? (
          <Reveal id="voicings" index={index('voicings')} title="Voicings">
            <div className={styles.rowBody}>
              <p className={styles.rowIntro}>Shapes for comping through the form. Choose a chord to see its shapes, where it comes in the chart and where each shape leads.</p>
              <Voicings standard={standard} showAnalysis={showAnalysis} leftHanded={leftHanded} />
            </div>
          </Reveal>
        ) : null}

        {present['guide-tones'] ? (
          <Reveal id="guide-tones" index={index('guide-tones')} title="Guide tones">
            <div className={styles.rowBody}>
              <p className={styles.rowIntro}>
                The 3rd and 7th of each chord name its sound, and they move by step from one chord to the next. Loop an exercise at the Slow tempo and sing
                along before you play it.
              </p>
              <GuideTones standard={standard} showAnalysis={showAnalysis} leftHanded={leftHanded} />
            </div>
          </Reveal>
        ) : null}

        {present.ideas ? (
          <Reveal id="ideas" index={index('ideas')} title="Improvisation ideas">
            <div className={styles.rowBody}>
              <p className={styles.rowIntro}>{`${count(standard.improvisation.length, 'way')} into a solo on these changes. Take one per chorus rather than all at once.`}</p>
              <ol className={styles.ideas}>
                {standard.improvisation.map((idea, i) => (
                  <li key={i} className={styles.idea}>
                    <h3 className={styles.ideaTitle}>{curly(idea.title)}</h3>
                    <Prose text={typeset(idea.text)} ctx={chartCtx} className={styles.ideaText} />
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        ) : null}

        {present.plan ? (
          <Reveal id="plan" index={index('plan')} title="The seven-day plan" meta={<PlanCount standard={standard} weekKey={weekKey} />}>
            <div className={styles.rowBody}>
              <p className={styles.rowIntro}>Tick each task as you finish it. Your ticks are saved in this browser for this week.</p>
              <PracticePlan standard={standard} weekKey={weekKey} todayDay={todayDay} ctx={chartCtx} licks={lickMap} />
            </div>
          </Reveal>
        ) : null}

        {present.licks ? (
          <Reveal id="licks" index={index('licks')} title="Licks for this tune">
            <div className={styles.rowBody}>
              <p className={styles.rowIntro}>One a day, each written over a passage of these changes. Open one to read it in notation and tab, hear it and loop it.</p>
              <ol className={styles.licks}>
                {licks.map((l, i) => (
                  <li key={l.id}>
                    <Link href={l.href} className={styles.lickRow}>
                      <span className={`${styles.lickNumber} num`} aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className={styles.lickText}>
                        <span className={styles.lickTitle}>{curly(l.title)}</span>
                        {l.artist ? (
                          <>
                            {' '}
                            <span className={styles.lickBy}>{lickByline(l)}</span>
                          </>
                        ) : null}
                      </span>
                      {l.status === 'today' ? (
                        <span className={`${styles.lickStatus} ${styles.lickToday}`}> Today’s lick</span>
                      ) : l.status === 'done' ? (
                        <span className={styles.lickStatus}> Played</span>
                      ) : (
                        <span />
                      )}
                      <Icon name="arrowRight" size={22} className={styles.lickGo} />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        ) : null}

        <Reveal id="notes" index={index('notes')} title="Your notes" meta={hasNote ? 'Written' : null}>
          <NotesField lessonId={standard.id} placeholder="Which recording grabbed you? Which voicings sit well? What will you fix next week?" hideLabel />
        </Reveal>

        <Reveal id="credits" index={index('credits')} title="Sources and credits">
          <div className={lessonStyles.credits}>
            {standard.simplified && standard.simplificationNote ? (
              <p>
                <strong>One version of the changes.</strong> {typeset(standard.simplificationNote)}
              </p>
            ) : null}
            <p>
              The chord changes, analysis, voicings and exercises on this page are written for this app. The melody and lyrics are not reproduced: learn the
              melody by ear{present.listen ? ' from the recordings under Listen' : ''}.
            </p>
            <SourceList sources={standard.sources} />
            <Provenance lesson={standard} />
          </div>
        </Reveal>
      </RevealList>

      {next}
    </article>
  );
}
