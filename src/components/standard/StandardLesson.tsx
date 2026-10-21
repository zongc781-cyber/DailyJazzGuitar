'use client';

// The weekly standard: listening, chart, harmonic analysis, voicings, guide tones, improvisation
// ideas, the seven-day plan and the week's licks.

import Link from 'next/link';
import { Activity, useId, useMemo, useState } from 'react';
import type { Standard } from '@/lib/music/types';
import { prettyChord, prettyKey, prettyRoman } from '@/lib/music/pretty';
import { formatDate } from '@/lib/format';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { useProgress } from '@/lib/progress/store';
import { Icon } from '@/components/ui/Icon';
import ui from '@/components/ui/ui.module.css';
import lessonStyles from '@/components/lesson/lesson.module.css';
import { LessonActions } from '@/components/lesson/LessonActions';
import { LessonBadges, Provenance } from '@/components/lesson/LessonBadges';
import { NotesField } from '@/components/lesson/NotesField';
import { Prose, lineContext, type ProseContext } from '@/components/lesson/Prose';
import { SourceList } from '@/components/lesson/SourceList';
import { ChordChart } from './ChordChart';
import { ChordDiagram } from './ChordDiagram';
import { GuideTones } from './GuideTones';
import { PlanDayCard, PracticePlan, type PlanLick } from './PracticePlan';
import styles from './standard.module.css';

export interface WeekLick extends PlanLick {
  artist?: string;
  /** "today", "done" (assigned on an earlier day), or "upcoming". */
  status?: 'today' | 'done' | 'upcoming';
}

function StandardAnalysis({ standard, ctx, id }: { standard: Standard; ctx: ProseContext; id: string }) {
  const { analysis } = standard;
  return (
    <section className={styles.analysis} id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Harmonic analysis</h2>
      <Prose text={analysis.summary} ctx={ctx} className={lessonStyles.lead} />
      {analysis.sections?.map((s, i) => (
        <div key={i} className={styles.analysisSection}>
          <h3>{s.label}</h3>
          <Prose text={s.text} ctx={ctx} />
        </div>
      ))}
      <div className={styles.analysisSection}>
        <h3>Common variations</h3>
        <ul className={styles.variations}>
          {analysis.variations.map((v, i) => (
            <li key={i}>
              <h4>{v.name}</h4>
              <p className={styles.variationChords}>
                {v.chords.map((c, k) => (
                  <span key={k}>
                    <span className="num">Bar {c.bar}</span> <strong>{prettyChord(c.symbol)}</strong> <span className={styles.roman}>{prettyRoman(c.roman)}</span>
                  </span>
                ))}
              </p>
              <Prose text={v.text} ctx={lineContext([], v.chords, standard.key)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function StandardLesson({
  standard,
  eyebrow,
  weekKey,
  todayDay,
  licks,
  review,
}: {
  standard: Standard;
  eyebrow: string;
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
  const centres = [...new Set(standard.keyCenters.map((c) => prettyKey(c)))];

  return (
    <article className={lessonStyles.lesson}>
      <header className={lessonStyles.header}>
        <p className={ui.eyebrow}>{eyebrow}</p>
        <h1 className={lessonStyles.title}>{standard.title}</h1>
        <p className={lessonStyles.byline}>
          {standard.composers.join(' and ')} · {standard.year}
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>Form</dt>
            <dd>
              {standard.form.label}, {standard.chart.length} bars
            </dd>
          </div>
          <div>
            <dt>Key centres</dt>
            <dd>{centres.join(', ')}</dd>
          </div>
          <div>
            <dt>Feel</dt>
            <dd>
              {standard.feel === 'swing' ? 'Swing' : 'Straight eighths'}, around {standard.tempo.default} BPM
            </dd>
          </div>
        </dl>
        <LessonBadges lesson={standard} review={review} />
        <LessonActions id={standard.id} dateKey={dateKey} entry={{ kind: 'standard', title: standard.title, origin: standard.origin }} />
      </header>

      {today ? (
        <section className={styles.todayCard} aria-labelledby={`${analysisId}-today`}>
          <h2 id={`${analysisId}-today`}>Today’s practice</h2>
          <PlanDayCard standardId={standard.id} day={today} weekKey={weekKey} today ctx={chartCtx} lick={today.lickId ? lickMap.get(today.lickId) : undefined} featured />
        </section>
      ) : null}

      {standard.simplified && standard.simplificationNote ? (
        <p className={styles.simplified}>
          <Icon name="info" size={20} />
          <span>
            <strong>Simplified arrangement.</strong> {standard.simplificationNote}
          </span>
        </p>
      ) : null}

      <section aria-labelledby={`${analysisId}-listen`}>
        <h2 id={`${analysisId}-listen`}>Listen</h2>
        <ul className={styles.listening}>
          {standard.listening.map((l, i) => (
            <li key={i}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className={styles.listenLink}>
                <Icon name="headphones" />
                <span className={styles.listenText}>
                  <strong>{l.performer}</strong>
                  <span>
                    {l.recording}
                    {l.album ? `, from ${l.album}` : ''} ({l.year})
                  </span>
                </span>
                <Icon name="external" size={18} />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              {l.note ? <p className={styles.listenNote}>{l.note}</p> : null}
              <p className={styles.verified}>Link checked {formatDate(l.verifiedOn)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${analysisId}-chart`}>
        <div className={styles.sectionHeader}>
          <h2 id={`${analysisId}-chart`}>Chord chart</h2>
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
        {showAnalysis ? null : <p className={lessonStyles.analysisHint}>Show the analysis to add roman numerals, key-centre shading and the harmonic analysis with common variations.</p>}
      </section>

      <Activity mode={showAnalysis ? 'visible' : 'hidden'}>
        <StandardAnalysis standard={standard} ctx={chartCtx} id={analysisId} />
      </Activity>

      <section aria-labelledby={`${analysisId}-voicings`}>
        <h2 id={`${analysisId}-voicings`}>Voicings</h2>
        <p className={styles.sectionIntro}>Compact shapes for comping through the form. {showAnalysis ? 'Dots show chord degrees.' : 'Numbers are fingers; × means the string is not played.'}</p>
        <div className={styles.voicings}>
          {standard.voicings.map((v, i) => (
            <div key={i} className={styles.voicingCard}>
              <ChordDiagram voicing={v} showAnalysis={showAnalysis} leftHanded={leftHanded} />
              {v.note ? <p className={styles.voicingNote}>{v.note}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby={`${analysisId}-guide`}>
        <h2 id={`${analysisId}-guide`}>Guide-tone exercises</h2>
        <GuideTones standard={standard} showAnalysis={showAnalysis} leftHanded={leftHanded} />
      </section>

      <section aria-labelledby={`${analysisId}-impro`}>
        <h2 id={`${analysisId}-impro`}>Improvisation ideas</h2>
        <ul className={styles.ideas}>
          {standard.improvisation.map((idea, i) => (
            <li key={i}>
              <h3>{idea.title}</h3>
              <Prose text={idea.text} ctx={chartCtx} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${analysisId}-plan`}>
        <h2 id={`${analysisId}-plan`}>Seven-day plan</h2>
        <PracticePlan standard={standard} weekKey={weekKey} todayDay={todayDay} ctx={chartCtx} licks={lickMap} />
      </section>

      {licks.length ? (
        <section aria-labelledby={`${analysisId}-licks`}>
          <h2 id={`${analysisId}-licks`}>Licks for this tune</h2>
          <p className={styles.sectionIntro}>One a day, each written over a passage of these changes.</p>
          <ul className={styles.weekLicks}>
            {licks.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className={styles.weekLick}>
                  <span className={styles.weekLickTitle}>{l.title}</span>
                  {l.artist ? <span className={styles.weekLickArtist}>In the style of {l.artist}</span> : null}
                  {l.status === 'today' ? <span className={`${ui.badge} ${ui.badgeSeed}`}>Today</span> : l.status === 'done' ? <span className={ui.badge}>Played</span> : null}
                  <Icon name="chevronRight" size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <NotesField lessonId={standard.id} placeholder="Which recording grabbed you? Which voicings sit well? What will you work on next week?" />

      <footer className={lessonStyles.credits}>
        <h2>Sources and credits</h2>
        <p>Chord changes, analysis and exercises are written for this app. The melody and lyrics are not reproduced; learn the melody from the recordings above.</p>
        <SourceList sources={standard.sources} />
        <Provenance lesson={standard} />
      </footer>
    </article>
  );
}
