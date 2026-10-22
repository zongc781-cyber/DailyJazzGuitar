'use client';

// Progress: the practice streak beside a calendar of practice days, what has been learned, the
// learner's notes, preferences, and export, import or reset of the data kept in this browser.

import Link from 'next/link';
import { Fragment, ViewTransition, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { addDays, daysBetween, isoWeekKey, weekDates } from '@/lib/schedule';
import { formatDate, formatShortDate } from '@/lib/format';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { getProgress, replaceProgress, useHydrated, useProgress } from '@/lib/progress/store';
import { setPreference } from '@/lib/progress/actions';
import { emptyState, migrate, STATE_VERSION, type NotationMode, type ProgressState, type ThemePref } from '@/lib/progress/state';
import { Icon } from '@/components/ui/Icon';
import { Pencil, RehearsalHeading } from '@/components/ui/Pencil';
import ui from '@/components/ui/ui.module.css';
import styles from './screens.module.css';

/** Half a year of practice days. */
const WEEKS_SHOWN = 26;
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
// Three letters each, so the month names sit evenly over the calendar's weeks ("Sep", not "Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function monthShort(dateKey: string): string {
  return MONTHS[Number(dateKey.slice(5, 7)) - 1];
}

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

function longestRun(counts: Map<string, number>): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of [...counts.keys()].sort()) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** The current streak in a big serif number, what to do next, and the page's one blue action. */
function Streak({ counts, today }: { counts: Map<string, number>; today: string | null }) {
  const n = today ? streak(counts, today) : null;
  const done = today ? counts.has(today) : false;
  const note =
    n === null
      ? ' '
      : n === 0
        ? 'Tick one practice step on today’s lick to start a run.'
        : done
          ? `You’ve practised today. Come back tomorrow to make it ${n + 1}.`
          : `Tick a practice step today to make it ${n + 1}.`;
  return (
    <div className={styles.streak}>
      <p className={ui.eyebrow}>Current streak</p>
      <p className={styles.streakFigure}>
        <span className={`${styles.streakNumber} num`}>{n ?? '–'}</span>
        <span className={styles.streakUnit}>{n === 1 ? 'day in a row' : 'days in a row'}</span>
      </p>
      <p className={styles.streakNote}>{note}</p>
      <Link href="/" className={`${ui.button} ${ui.primary}`}>
        {done ? 'Open today’s lick' : 'Practise today’s lick'}
      </Link>
    </div>
  );
}

/** One square a day, Monday at the top, shaded by how many practice steps were ticked. */
function Calendar({ counts, today }: { counts: Map<string, number>; today: string }) {
  const lastMonday = weekDates(today)[0];
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, w) => weekDates(addDays(lastMonday, (w - WEEKS_SHOWN + 1) * 7)));
  const span = daysBetween(weeks[0][0], today) + 1;
  const active = weeks.flat().filter((d) => d <= today && counts.has(d)).length;
  // Month names stand over the week each month starts in, and over the first week when there is room.
  const months = weeks.map((days, w) => {
    const first = days.find((d) => d.endsWith('-01'));
    if (first) return monthShort(first);
    const roomy = w === 0 && !weeks.slice(1, 3).some((ds) => ds.some((d) => d.endsWith('-01')));
    return roomy ? monthShort(days[0]) : '';
  });
  return (
    <figure className={styles.calendar}>
      <figcaption className={styles.calendarHead}>
        <span className={ui.eyebrow}>Practice days, last six months</span>
        <span className={styles.calendarKey} aria-hidden="true">
          <span>
            <span className={styles.day} />
            None
          </span>
          <span>
            <span className={`${styles.day} ${styles.l1}`} />
            1–2 steps
          </span>
          <span>
            <span className={`${styles.day} ${styles.l2}`} />
            3–5
          </span>
          <span>
            <span className={`${styles.day} ${styles.l3}`} />6 or more
          </span>
        </span>
      </figcaption>
      <div
        className={styles.calendarGrid}
        style={{ '--weeks': WEEKS_SHOWN } as CSSProperties}
        role="img"
        aria-label={`Practice calendar for the last ${WEEKS_SHOWN} weeks: you practised on ${plural(active, 'day')} out of ${span}. Today, ${formatDate(today)}, is circled.`}
      >
        <span />
        {WEEKDAYS.map((d, i) => (
          <span key={i} className={styles.calendarWeekday}>
            {d}
          </span>
        ))}
        {weeks.map((days, w) => (
          <Fragment key={days[0]}>
            <span className={styles.calendarMonth}>{months[w]}</span>
            {days.map((d) => {
              const n = counts.get(d) ?? 0;
              const level = d > today ? styles.future : n === 0 ? '' : n < 3 ? styles.l1 : n < 6 ? styles.l2 : styles.l3;
              return (
                <span key={d} className={`${styles.day} ${level}`} title={d > today ? undefined : `${formatDate(d)}: ${n === 0 ? 'no practice' : plural(n, 'practice step')}`}>
                  {d === today ? <Pencil kind="circle" draw className={styles.todayCircle} /> : null}
                </span>
              );
            })}
          </Fragment>
        ))}
      </div>
    </figure>
  );
}

/**
 * A scale of note heads on a staff, up and back down, filled in ink for each lesson learned: the
 * tune you complete as you learn. Long libraries are drawn to scale, at most 32 notes.
 */
function Melody({ total, filled, offset = 0 }: { total: number; filled: number; offset?: number }) {
  const n = Math.max(1, Math.min(total, 32));
  const lit = total > 32 ? Math.round((filled / total) * 32) : filled;
  const step = 22;
  const width = n * step + 10;
  const y = (i: number) => {
    const p = (i + offset) % 16;
    return 40 - (p <= 8 ? p : 16 - p) * 4;
  };
  return (
    <svg className={styles.melody} viewBox={`0 0 ${width} 48`} style={{ '--melody-width': `${Math.round(width * 1.35)}px` } as CSSProperties} aria-hidden="true" focusable="false">
      {[8, 16, 24, 32, 40].map((ly) => (
        <line key={ly} x1="0" x2={width} y1={ly} y2={ly} className={styles.melodyStaff} />
      ))}
      <line x1="0.6" x2="0.6" y1="8" y2="40" className={styles.melodyBar} />
      <line x1={width - 0.6} x2={width - 0.6} y1="8" y2="40" className={styles.melodyBar} />
      {Array.from({ length: n }, (_, i) => {
        const cx = 15 + i * step;
        const cy = y(i);
        return <ellipse key={i} cx={cx} cy={cy} rx="5.4" ry="3.9" transform={`rotate(-22 ${cx} ${cy})`} className={i < lit ? styles.noteOn : styles.noteOff} />;
      })}
    </svg>
  );
}

// The two themes as small sheets of paper. These show each theme whichever one is in use, so they
// use the theme colours directly rather than the tokens.
const SHEETS = {
  light: { paper: '#f5f2ea', ink: '#15161a', line: '#c5c0b4', accent: '#2450d8' },
  dark: { paper: '#111214', ink: '#eeebe4', line: '#44454b', accent: '#8ba3ff' },
};

function Sheet({ c }: { c: (typeof SHEETS)['light'] }) {
  return (
    <>
      <rect width="88" height="58" fill={c.paper} />
      <rect x="10" y="11" width="44" height="7" rx="1.5" fill={c.ink} />
      <rect x="10" y="25" width="64" height="2" rx="1" fill={c.line} />
      <rect x="10" y="31" width="54" height="2" rx="1" fill={c.line} />
      <rect x="10" y="41" width="22" height="8" rx="4" fill={c.accent} />
    </>
  );
}

function ThemePreview({ mode }: { mode: ThemePref }) {
  const clip = `split-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 88 58" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <Sheet c={mode === 'dark' ? SHEETS.dark : SHEETS.light} />
      {mode === 'system' ? (
        <>
          <clipPath id={clip}>
            <path d="M88 0V58H0z" />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            <Sheet c={SHEETS.dark} />
          </g>
        </>
      ) : null}
    </svg>
  );
}

/** Notation, tab or both, drawn small. */
function NotationPreview({ mode }: { mode: NotationMode }) {
  const lines = (top: number, gap: number, count: number) =>
    Array.from({ length: count }, (_, i) => <line key={`${top}-${i}`} x1="8" x2="80" y1={top + i * gap} y2={top + i * gap} className={styles.notationLines} />);
  const notes = (spots: [number, number][], stem: number) =>
    spots.map(([x, y]) => (
      <g key={`${x}-${y}`}>
        <ellipse cx={x} cy={y} rx="3.3" ry="2.4" transform={`rotate(-22 ${x} ${y})`} className={styles.notationInk} />
        <line x1={x + 3} x2={x + 3} y1={y - 0.5} y2={y - stem} className={styles.notationStem} />
      </g>
    ));
  const frets = (spots: [number, number, string][]) =>
    spots.map(([x, y, f]) => (
      <text key={`${x}-${y}`} x={x} y={y + 2.8} textAnchor="middle" className={styles.notationFret}>
        {f}
      </text>
    ));
  return (
    <svg viewBox="0 0 88 58" aria-hidden="true" focusable="false">
      {mode === 'score' ? (
        <>
          {lines(17, 6, 5)}
          {notes(
            [
              [24, 38],
              [40, 32],
              [56, 26],
              [70, 32],
            ],
            15,
          )}
        </>
      ) : mode === 'tab' ? (
        <>
          {lines(11, 7, 6)}
          {frets([
            [24, 32, '5'],
            [40, 25, '7'],
            [56, 18, '8'],
            [70, 25, '5'],
          ])}
        </>
      ) : (
        <>
          {lines(8, 4, 5)}
          {notes(
            [
              [26, 22],
              [44, 18],
              [62, 14],
            ],
            10,
          )}
          {lines(32, 4, 6)}
          {frets([
            [26, 44, '5'],
            [44, 40, '7'],
            [62, 36, '8'],
          ])}
        </>
      )}
    </svg>
  );
}

function Choices<T extends string>({ labelledBy, value, options, preview, onChange }: { labelledBy: string; value: T; options: { value: T; label: string }[]; preview: (v: T) => ReactNode; onChange: (v: T) => void }) {
  return (
    <div className={styles.choices} role="group" aria-labelledby={labelledBy}>
      {options.map((o) => (
        <button key={o.value} type="button" className={styles.choice} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          <span className={styles.choicePreview}>{preview(o.value)}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <div className={`${styles.pref} ${styles.prefLine}`}>
      <span className={styles.prefText}>
        <label htmlFor={id} className={styles.prefName}>
          {label}
        </label>
        {hint ? (
          <span id={`${id}-hint`} className={styles.prefHint}>
            {hint}
          </span>
        ) : null}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.switch}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
  );
}

// The playback bar's tempo presets, as shares of each lesson's target tempo.
const TEMPO_PRESETS = [
  { label: 'Slow', percent: 60 },
  { label: 'Practice', percent: 80 },
  { label: 'Target', percent: 100 },
];

function StartTempo({ value }: { value: number }) {
  const id = useId();
  return (
    <div className={styles.pref}>
      <div className={styles.tempoTop}>
        <span className={styles.prefText}>
          <label htmlFor={id} className={styles.prefName}>
            Starting tempo
          </label>
          <span className={styles.prefHint}>Each lick opens at this share of its target tempo.</span>
        </span>
        {/* The chosen preset is circled in pencil, as on the playback bar. */}
        <div className={styles.presets} role="group" aria-label="Starting tempo presets">
          {TEMPO_PRESETS.map((p) => {
            const chosen = value === p.percent;
            return (
              <button key={p.label} type="button" className={styles.preset} aria-pressed={chosen} onClick={() => setPreference('startTempoPercent', p.percent)}>
                {p.label} <span className="num">{p.percent}%</span>
                {chosen ? <Pencil kind="circle" draw className={styles.presetMark} /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.tempoRow}>
        <input
          id={id}
          type="range"
          className={styles.slider}
          style={{ '--fill': `${((value - 40) / 60) * 100}%` } as CSSProperties}
          min={40}
          max={100}
          step={5}
          value={value}
          onChange={(e) => setPreference('startTempoPercent', Number(e.target.value))}
          aria-valuetext={`${value} percent of the target tempo`}
        />
        <output htmlFor={id} className={`${styles.tempoValue} num`}>
          {value}
          <span>%</span>
        </output>
      </div>
    </div>
  );
}

function Preferences() {
  const prefs = useProgress((s) => s.prefs);
  const themeId = useId();
  const notationId = useId();
  return (
    <div className={styles.prefs}>
      <div className={styles.prefGroup}>
        <div className={styles.prefGroupHead}>
          <h3>On the page</h3>
          <p>How lessons look in this browser.</p>
        </div>
        <div className={styles.pref}>
          <span className={styles.prefText}>
            <span id={themeId} className={styles.prefName}>
              Theme
            </span>
            <span className={styles.prefHint}>System follows your Mac’s light or dark appearance.</span>
          </span>
          <Choices<ThemePref>
            labelledBy={themeId}
            value={prefs.theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            preview={(v) => <ThemePreview mode={v} />}
            onChange={(v) => setPreference('theme', v)}
          />
        </div>
        <div className={styles.pref}>
          <span className={styles.prefText}>
            <span id={notationId} className={styles.prefName}>
              Notation
            </span>
            <span className={styles.prefHint}>What the score sheet shows above the playback bar.</span>
          </span>
          <Choices<NotationMode>
            labelledBy={notationId}
            value={prefs.notation}
            options={[
              { value: 'score-tab', label: 'Score + tab' },
              { value: 'tab', label: 'Tab' },
              { value: 'score', label: 'Score' },
            ]}
            preview={(v) => <NotationPreview mode={v} />}
            onChange={(v) => setPreference('notation', v)}
          />
        </div>
        <Switch
          label="Show the analysis straight away"
          hint="Otherwise it stays hidden until you press Show analysis, so you can work the line out by ear first."
          checked={prefs.showAnalysis}
          onChange={(v) => setPreference('showAnalysis', v)}
        />
        <Switch label="Left-handed diagrams" hint="Mirror the fretboard and the chord diagrams." checked={prefs.leftHanded} onChange={(v) => setPreference('leftHanded', v)} />
      </div>
      <div className={styles.prefGroup}>
        <div className={styles.prefGroupHead}>
          <h3>Playback</h3>
          <p>The Loop, Count-in and Metronome buttons on the playback bar change these too.</p>
        </div>
        <StartTempo value={prefs.startTempoPercent} />
        <Switch label="Count-in" hint="A bar of clicks before the line starts." checked={prefs.countIn} onChange={(v) => setPreference('countIn', v)} />
        <Switch label="Metronome" hint="A click on every beat while it plays." checked={prefs.metronome} onChange={(v) => setPreference('metronome', v)} />
        <Switch label="Loop" hint="Go back to the top until you press Stop." checked={prefs.loop} onChange={(v) => setPreference('loop', v)} />
      </div>
    </div>
  );
}

/**
 * What a progress state holds, in words: "6 learned lessons, 4 favourites, 3 notes and 16 days of
 * practice". Kinds with none are left out, and a state with none of them gives null.
 */
function holdings(s: ProgressState): string | null {
  const days = Object.values(s.practice).filter((day) => Object.values(day).some((items) => items.length > 0)).length;
  const counts: [number, string][] = [
    [Object.keys(s.learned).length, 'learned lesson'],
    [Object.keys(s.favourites).length, 'favourite'],
    [Object.keys(s.notes).length, 'note'],
    [days, 'day'],
  ];
  const parts = counts.filter(([n]) => n > 0).map(([n, word]) => (word === 'day' ? `${plural(n, word)} of practice` : plural(n, word)));
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

function DataControls({ dateKey, state }: { dateKey: string; state: ProgressState }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ state: ProgressState; name: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileId = useId();
  const confirmId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  // A confirmation takes the focus, on its safe choice, when it opens.
  useEffect(() => {
    if (confirmReset || pendingImport) keepRef.current?.focus();
  }, [confirmReset, pendingImport]);

  const fileName = `daily-jazz-guitar-progress-${dateKey}.json`;
  const held = holdings(state);
  const exportData = () => {
    const blob = new Blob([JSON.stringify(getProgress(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Exported ${fileName}.`);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as { version?: unknown };
      if (raw?.version !== STATE_VERSION) throw new Error('not a progress file');
      setConfirmReset(false);
      setPendingImport({ state: migrate(raw), name: file.name });
      setMessage(null);
    } catch {
      setMessage(`${file.name} is not a Daily Jazz Guitar progress export.`);
    }
  };

  const closeReset = () => {
    setConfirmReset(false);
    resetRef.current?.focus();
  };

  return (
    <div className={styles.data}>
      <div className={styles.dataActions}>
        <button type="button" className={ui.button} onClick={exportData}>
          Export a copy
        </button>
        <label htmlFor={fileId} className={ui.button}>
          Import a copy…
        </label>
        <input id={fileId} type="file" accept="application/json,.json" className="visually-hidden" onChange={onFile} />
        <button
          ref={resetRef}
          type="button"
          className={`${ui.button} ${ui.ghost}`}
          aria-expanded={confirmReset}
          aria-controls={confirmReset ? confirmId : undefined}
          onClick={() => {
            setPendingImport(null);
            setConfirmReset(!confirmReset);
          }}
        >
          Reset…
        </button>
      </div>
      {pendingImport ? (
        <div className={styles.confirm} role="alertdialog" aria-labelledby={`${confirmId}-import`} aria-describedby={`${confirmId}-import-text`}>
          <p id={`${confirmId}-import`} className={styles.confirmTitle}>
            Replace your progress with {pendingImport.name}?
          </p>
          <p id={`${confirmId}-import-text`}>
            The file holds {holdings(pendingImport.state) ?? 'no learned lessons, favourites, notes or practice'}. What is in this browser now is replaced, so
            export a copy first if you want to keep it.
          </p>
          <div className={styles.dataActions}>
            <button
              type="button"
              className={`${ui.button} ${ui.primary}`}
              onClick={() => {
                replaceProgress(pendingImport.state);
                setPendingImport(null);
                setMessage(`Imported ${pendingImport.name}.`);
              }}
            >
              Replace my progress
            </button>
            <button ref={keepRef} type="button" className={ui.button} onClick={() => setPendingImport(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {confirmReset ? (
        <div id={confirmId} className={styles.confirm} role="alertdialog" aria-labelledby={`${confirmId}-title`} aria-describedby={`${confirmId}-text`}>
          <p id={`${confirmId}-title`} className={styles.confirmTitle}>
            Erase your progress?
          </p>
          <p id={`${confirmId}-text`}>
            This erases {held ? `${held}, along with your lesson history,` : 'your lesson history'} from this browser. Your preferences stay. It cannot be undone,
            so export a copy first if you might want it back.
          </p>
          <div className={styles.dataActions}>
            <button
              type="button"
              className={`${ui.button} ${ui.danger}`}
              onClick={() => {
                replaceProgress({ ...emptyState(), prefs: getProgress().prefs });
                setConfirmReset(false);
                setMessage('Progress erased. Your preferences were kept.');
                resetRef.current?.focus();
              }}
            >
              Erase my progress
            </button>
            <button ref={keepRef} type="button" className={ui.button} onClick={closeReset}>
              Keep it
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

  const today = hydrated && dateKey ? dateKey : null;
  const lickTotal = catalog.filter((e) => e.kind === 'lick').length;
  const standardTotal = catalog.filter((e) => e.kind === 'standard').length;
  const learned = Object.values(state.learned);
  const licksLearned = learned.filter((e) => e.kind === 'lick').length;
  const standardsLearned = learned.filter((e) => e.kind === 'standard').length;
  const notes = Object.entries(state.notes).sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt));
  const weekTicks = today ? Object.values(state.plan[isoWeekKey(today)] ?? {}).reduce((n, t) => n + t.length, 0) : 0;
  const lastSeven = today ? Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter((d) => counts.has(d)).length : 0;
  const longest = longestRun(counts);
  const held = today ? holdings(state) : null;

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={`${styles.screen} ${styles.page}`}>
        <header className={styles.pageHeader}>
          <p className={ui.eyebrow}>Progress</p>
          <h1 className={styles.headline}>The woodshed</h1>
          <p className={styles.pageIntro}>Tick one practice step a day to keep the run going. Every day you do is pencilled in below.</p>
        </header>

        <section className={styles.practice} aria-labelledby="practice-title">
          <h2 id="practice-title" className="visually-hidden">
            Practice
          </h2>
          <Streak counts={counts} today={today} />
          <div className={styles.calendarColumn}>
            {today ? (
              <>
                <Calendar counts={counts} today={today} />
                <dl className={styles.facts}>
                  <div>
                    <dt>Days practised</dt>
                    <dd className="num">{counts.size}</dd>
                  </div>
                  <div>
                    <dt>Longest run</dt>
                    <dd className="num">
                      {longest}
                      <span> {longest === 1 ? 'day' : 'days'}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Last 7 days</dt>
                    <dd className="num">
                      {lastSeven}
                      <span> of 7</span>
                    </dd>
                  </div>
                  <div>
                    <dt>This week’s plan</dt>
                    <dd className="num">
                      {weekTicks}
                      <span> {weekTicks === 1 ? 'task' : 'tasks'} ticked</span>
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className={ui.skeleton} style={{ height: 260 }} aria-hidden="true" />
            )}
          </div>
        </section>

        <section className={styles.tally} aria-labelledby="learned-title">
          <h2 id="learned-title" className="visually-hidden">
            Learned
          </h2>
          <div className={styles.tallyItem}>
            <p className={styles.tallyFigure}>
              <span className={`${styles.tallyNumber} num`}>{today ? licksLearned : '–'}</span>
              <span className={styles.tallyOf}>of {lickTotal}</span>
              <span className={styles.tallyLabel}>licks learned</span>
            </p>
            <Melody total={lickTotal} filled={today ? licksLearned : 0} />
          </div>
          <div className={styles.tallyItem}>
            <p className={styles.tallyFigure}>
              <span className={`${styles.tallyNumber} num`}>{today ? standardsLearned : '–'}</span>
              <span className={styles.tallyOf}>of {standardTotal}</span>
              <span className={styles.tallyLabel}>{standardTotal === 1 ? 'standard' : 'standards'} learned</span>
            </p>
            <Melody total={standardTotal} filled={today ? standardsLearned : 0} offset={2} />
          </div>
          <p className={styles.tallyLink}>
            <Link href="/library?tab=learned" className={styles.arrowLink}>
              See what you learned and when
              <Icon name="chevronRight" size={16} />
            </Link>
          </p>
        </section>

        <section className={styles.section} aria-labelledby="notes-title">
          <div className={styles.sectionHead}>
            <RehearsalHeading letter="A" id="notes-title">
              Your notes
            </RehearsalHeading>
            <p className={styles.sectionIntro}>What you wrote under each lesson, newest first. Open a lesson to add to its note.</p>
          </div>
          {!today ? null : notes.length === 0 ? (
            <p className={styles.emptyText}>Nothing yet. Notes you write beside a lesson’s practice checklist show up here, so you can read them back before you play.</p>
          ) : (
            <ul className={styles.notes}>
              {notes.map(([id, note]) => {
                const entry = byId.get(id);
                return (
                  <li key={id} className={styles.note}>
                    <div className={styles.noteHead}>
                      <h3 className={styles.noteTitle}>{entry ? <Link href={`/lessons/${id}`}>{entry.title}</Link> : id}</h3>
                      <span className={styles.noteDate}>{formatShortDate(note.updatedAt)}</span>
                    </div>
                    <p className={styles.noteText}>{note.text.length > 320 ? `${note.text.slice(0, 320).trimEnd()}…` : note.text}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.section} aria-labelledby="prefs-title">
          <div className={styles.sectionHead}>
            <RehearsalHeading letter="B" id="prefs-title">
              Preferences
            </RehearsalHeading>
            <p className={styles.sectionIntro}>Changes apply straight away and are kept in this browser.</p>
          </div>
          <Preferences />
        </section>

        <section className={styles.section} aria-labelledby="data-title">
          <div className={styles.sectionHead}>
            <RehearsalHeading letter="C" id="data-title">
              Your data
            </RehearsalHeading>
            <p className={styles.sectionIntro}>
              Your progress lives in this browser, not on a server{held ? <>: {held}</> : null}. Export a copy to move it to another browser or to keep a backup.
            </p>
          </div>
          {today ? <DataControls dateKey={today} state={state} /> : null}
        </section>
      </div>
    </ViewTransition>
  );
}
