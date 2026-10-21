'use client';

// Progress: completed practice, learned lessons, notes and preferences, plus export, import and
// reset of the data kept in this browser.

import Link from 'next/link';
import { ViewTransition, useId, useMemo, useState, type ChangeEvent } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { addDays, isoWeekKey, weekDates } from '@/lib/schedule';
import { formatDate, formatShortDate } from '@/lib/format';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { getProgress, replaceProgress, useHydrated, useProgress } from '@/lib/progress/store';
import { setPreference } from '@/lib/progress/actions';
import { emptyState, migrate, STATE_VERSION, type NotationMode, type ProgressState, type ThemePref } from '@/lib/progress/state';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import ui from '@/components/ui/ui.module.css';
import styles from './screens.module.css';

const WEEKS_SHOWN = 12;

function practiceCounts(state: ProgressState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [date, lessons] of Object.entries(state.practice)) {
    const n = Object.values(lessons).reduce((sum, items) => sum + items.length, 0);
    if (n > 0) counts.set(date, n);
  }
  return counts;
}

function streak(counts: Map<string, number>, today: string): number {
  // A streak that has not been extended yet today still counts until the day is over.
  let day = counts.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (counts.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

function Calendar({ counts, today }: { counts: Map<string, number>; today: string }) {
  const lastMonday = weekDates(today)[0];
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, w) => weekDates(addDays(lastMonday, (w - WEEKS_SHOWN + 1) * 7)));
  const active = weeks.flat().filter((d) => counts.has(d) && d <= today).length;
  return (
    <figure className={styles.calendar}>
      <div className={styles.calendarGrid} role="img" aria-label={`Practice on ${active} of the last ${WEEKS_SHOWN * 7} days`}>
        {weeks.map((days, w) => (
          <div key={w} className={styles.calendarWeek}>
            {days.map((d) => {
              const n = counts.get(d) ?? 0;
              const level = d > today ? 'future' : n === 0 ? 'l0' : n < 3 ? 'l1' : n < 6 ? 'l2' : 'l3';
              return <span key={d} className={`${styles.calendarDay} ${styles[level]} ${d === today ? styles.calendarToday : ''}`} title={`${formatDate(d)}: ${n} practice step${n === 1 ? '' : 's'}`} />;
            })}
          </div>
        ))}
      </div>
      <figcaption className={styles.calendarCaption}>
        <span>Last {WEEKS_SHOWN} weeks, Monday at the top</span>
        <span className={styles.calendarKey} aria-hidden="true">
          Less <span className={`${styles.calendarDay} ${styles.l0}`} />
          <span className={`${styles.calendarDay} ${styles.l1}`} />
          <span className={`${styles.calendarDay} ${styles.l2}`} />
          <span className={`${styles.calendarDay} ${styles.l3}`} /> More
        </span>
      </figcaption>
    </figure>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className={styles.switchRow}>
      <label htmlFor={id} className={styles.switchText}>
        <span>{label}</span>
        {hint ? <span className={styles.switchHint}>{hint}</span> : null}
      </label>
      <input id={id} type="checkbox" role="switch" className={styles.switch} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

function Preferences() {
  const prefs = useProgress((s) => s.prefs);
  const tempoId = useId();
  return (
    <div className={styles.prefs}>
      <div className={styles.prefRow}>
        <span className={styles.prefLabel}>Theme</span>
        <Segmented<ThemePref>
          label="Theme"
          value={prefs.theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => setPreference('theme', v)}
        />
      </div>
      <div className={styles.prefRow}>
        <span className={styles.prefLabel}>Notation</span>
        <Segmented<NotationMode>
          label="Notation"
          value={prefs.notation}
          options={[
            { value: 'score-tab', label: 'Score + tab' },
            { value: 'tab', label: 'Tab' },
            { value: 'score', label: 'Score' },
          ]}
          onChange={(v) => setPreference('notation', v)}
        />
      </div>
      <div className={styles.prefRow}>
        <label htmlFor={tempoId} className={styles.prefLabel}>
          Starting tempo
          <span className={styles.switchHint}>Percent of each lesson’s target tempo</span>
        </label>
        <div className={styles.tempoPref}>
          <input
            id={tempoId}
            type="range"
            min={40}
            max={100}
            step={5}
            value={prefs.startTempoPercent}
            onChange={(e) => setPreference('startTempoPercent', Number(e.target.value))}
            aria-valuetext={`${prefs.startTempoPercent} percent`}
          />
          <output htmlFor={tempoId} className="num">
            {prefs.startTempoPercent}%
          </output>
        </div>
      </div>
      <Switch label="Show the analysis straight away" hint="Otherwise it stays hidden until you press Show analysis." checked={prefs.showAnalysis} onChange={(v) => setPreference('showAnalysis', v)} />
      <Switch label="Count-in" checked={prefs.countIn} onChange={(v) => setPreference('countIn', v)} />
      <Switch label="Metronome" checked={prefs.metronome} onChange={(v) => setPreference('metronome', v)} />
      <Switch label="Loop playback" checked={prefs.loop} onChange={(v) => setPreference('loop', v)} />
      <Switch label="Left-handed diagrams" hint="Mirror the fretboard and chord boxes." checked={prefs.leftHanded} onChange={(v) => setPreference('leftHanded', v)} />
    </div>
  );
}

function DataControls({ dateKey }: { dateKey: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<ProgressState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileId = useId();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-jazz-guitar-progress-${dateKey}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Progress exported.');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as { version?: unknown };
      if (raw?.version !== STATE_VERSION) throw new Error('not a progress file');
      setPendingImport(migrate(raw));
      setMessage(null);
    } catch {
      setMessage('That file is not a Daily Jazz Guitar progress export.');
    }
  };

  return (
    <div className={styles.data}>
      <div className={styles.dataButtons}>
        <button type="button" className={ui.button} onClick={exportData}>
          Export progress
        </button>
        <label htmlFor={fileId} className={ui.button}>
          Import progress
        </label>
        <input id={fileId} type="file" accept="application/json,.json" className="visually-hidden" onChange={onFile} />
        {confirmReset ? null : (
          <button type="button" className={`${ui.button} ${ui.danger}`} onClick={() => setConfirmReset(true)}>
            Reset progress
          </button>
        )}
      </div>
      {pendingImport ? (
        <div className={styles.confirm} role="alertdialog" aria-label="Replace progress">
          <p>
            Replace the progress in this browser with the imported file? It has {Object.keys(pendingImport.learned).length} learned lessons and{' '}
            {Object.keys(pendingImport.daily).length} days of history.
          </p>
          <div className={styles.dataButtons}>
            <button
              type="button"
              className={`${ui.button} ${ui.primary}`}
              onClick={() => {
                replaceProgress(pendingImport);
                setPendingImport(null);
                setMessage('Progress imported.');
              }}
            >
              Replace
            </button>
            <button type="button" className={ui.button} onClick={() => setPendingImport(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {confirmReset ? (
        <div className={styles.confirm} role="alertdialog" aria-label="Reset progress">
          <p>Erase every learned lesson, favourite, note, practice tick and lesson history in this browser? Export first if you want a copy.</p>
          <div className={styles.dataButtons}>
            <button
              type="button"
              className={`${ui.button} ${ui.danger}`}
              onClick={() => {
                const prefs = getProgress().prefs;
                replaceProgress({ ...emptyState(), prefs });
                setConfirmReset(false);
                setMessage('Progress erased. Your preferences were kept.');
              }}
            >
              Erase progress
            </button>
            <button type="button" className={ui.button} onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <p className={styles.dataMessage} role="status">
        {message ?? ''}
      </p>
    </div>
  );
}

export function ProgressScreen({ catalog }: { catalog: CatalogEntry[] }) {
  const dateKey = useLocalDate();
  const hydrated = useHydrated();
  const state = useProgress((s) => s);
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const counts = useMemo(() => practiceCounts(state), [state]);

  const lickTotal = catalog.filter((e) => e.kind === 'lick').length;
  const standardTotal = catalog.filter((e) => e.kind === 'standard').length;
  const learned = Object.values(state.learned);
  const licksLearned = learned.filter((e) => e.kind === 'lick').length;
  const standardsLearned = learned.filter((e) => e.kind === 'standard').length;
  const notes = Object.entries(state.notes).sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt));
  const ready = hydrated && dateKey;
  const weekTicks = ready ? Object.values(state.plan[isoWeekKey(dateKey)] ?? {}).reduce((n, t) => n + t.length, 0) : 0;
  const daysPractised = counts.size;
  const current = ready ? streak(counts, dateKey) : 0;
  const lastSeven = ready ? Array.from({ length: 7 }, (_, i) => addDays(dateKey, -i)).filter((d) => counts.has(d)).length : 0;

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.screen}>
        <header className={styles.pageHeader}>
          <p className={ui.eyebrow}>Progress</p>
          <h1>Your practice</h1>
          <p className={styles.pageIntro}>Practice ticks, learned lessons, notes and settings. Everything here stays in this browser.</p>
        </header>

        <section aria-labelledby="stats-title">
          <h2 id="stats-title" className="visually-hidden">
            Summary
          </h2>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Current streak</dt>
              <dd className="num">
                {current}
                <span> day{current === 1 ? '' : 's'}</span>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>Practised this week</dt>
              <dd className="num">
                {lastSeven}
                <span> of 7 days</span>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>Licks learned</dt>
              <dd className="num">
                {licksLearned}
                <span> of {lickTotal}</span>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>Standards learned</dt>
              <dd className="num">
                {standardsLearned}
                <span> of {standardTotal}</span>
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="practice-title" className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 id="practice-title">Completed practice</h2>
            <span className={ui.muted}>
              {daysPractised} day{daysPractised === 1 ? '' : 's'} in total · {weekTicks} plan task{weekTicks === 1 ? '' : 's'} this week
            </span>
          </div>
          {ready ? <Calendar counts={counts} today={dateKey} /> : <div className={ui.skeleton} style={{ height: 120 }} />}
          <p className={styles.panelFoot}>
            <Link href="/library?tab=learned">
              See the learned list <Icon name="chevronRight" size={16} />
            </Link>
          </p>
        </section>

        <section aria-labelledby="notes-title" className={styles.panel}>
          <h2 id="notes-title">Notes</h2>
          {notes.length === 0 ? (
            <p className={ui.empty}>Notes you write on a lesson appear here.</p>
          ) : (
            <ul className={styles.notesList}>
              {notes.map(([id, note]) => {
                const entry = byId.get(id);
                return (
                  <li key={id}>
                    <div className={styles.noteHead}>
                      {entry ? <Link href={`/lessons/${id}`}>{entry.title}</Link> : <span>{id}</span>}
                      <span className={ui.muted}>{formatShortDate(note.updatedAt)}</span>
                    </div>
                    <p className={styles.noteText}>{note.text.length > 280 ? `${note.text.slice(0, 280)}…` : note.text}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="prefs-title" className={styles.panel}>
          <h2 id="prefs-title">Preferences</h2>
          <Preferences />
        </section>

        <section aria-labelledby="data-title" className={styles.panel}>
          <h2 id="data-title">Your data</h2>
          <p className={styles.panelIntro}>Progress is kept in this browser’s storage, not on a server. Export it to move it to another browser or keep a backup.</p>
          {ready ? <DataControls dateKey={dateKey} /> : null}
        </section>
      </div>
    </ViewTransition>
  );
}
