'use client';

// Library: every lesson, set out like a record shop's catalogue. History files each day's lick
// under that week's standard, Learned lists what was marked as learned with the date and the key,
// Favourites is a shelf of hearted lessons, and All lessons is the whole book, grouped by standard
// under rehearsal letters, with search and filters.

import Link from 'next/link';
import { ViewTransition, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { prettyKey } from '@/lib/music/pretty';
import { licksFor } from '@/lib/catalog';
import { formatShortDate, formatWeekday } from '@/lib/format';
import { addDays, isoWeekKey, weekDates } from '@/lib/schedule';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { useHydrated, useProgress } from '@/lib/progress/store';
import { Icon } from '@/components/ui/Icon';
import { Pencil } from '@/components/ui/Pencil';
import { Segmented } from '@/components/ui/Segmented';
import ui from '@/components/ui/ui.module.css';
import styles from './screens.module.css';

export type LibraryTab = 'history' | 'learned' | 'favourites' | 'all';

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'learned', label: 'Learned' },
  { id: 'favourites', label: 'Favourites' },
  { id: 'all', label: 'All lessons' },
];

/** The open tab, remembered in this browser tab for the way back from a lesson (see LessonScreen). */
const TAB_KEY = 'djg:library-tab';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "October" for this year's months, "October 2025" for earlier ones. */
function monthName(month: string, today: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTH.format(new Date(Date.UTC(y, m - 1, 1)));
  return month.slice(0, 4) === today.slice(0, 4) ? name.replace(/\s\d{4}$/, '') : name;
}

/** "19–25 Oct", or "28 Sep – 4 Oct" across the end of a month. */
function dateRange(from: string, to: string): string {
  return from.slice(0, 7) === to.slice(0, 7) ? `${Number(from.slice(8, 10))}–${formatShortDate(to)}` : `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Whose style a lick is in (as in a lesson's byline), or who wrote a standard. */
function byline(e: CatalogEntry): string | null {
  if (e.kind === 'standard') return e.composers?.length ? e.composers.join(' and ') : null;
  if (!e.artist) return 'Original line';
  return e.inspirationType === 'in-the-style-of' ? `In the style of ${e.artist}` : `After ${e.artist}`;
}

function Details({ parts, difficulty }: { parts: (string | null | undefined)[]; difficulty?: number }) {
  return (
    <span className={styles.trackMeta}>
      {parts.filter(Boolean).join(' · ')}
      {difficulty ? (
        <>
          {' · '}
          <span className={styles.difficulty} aria-hidden="true">
            {'●'.repeat(difficulty) + '○'.repeat(Math.max(0, 5 - difficulty))}
          </span>
          <span className="visually-hidden">difficulty {difficulty} of 5</span>
        </>
      ) : null}
    </span>
  );
}

/** Where a lesson opens: today's lick on Today, this week's standard on This Week. */
function usePlace(dateKey: string | null) {
  const lickId = useProgress((s) => (dateKey ? s.daily[dateKey]?.lickId : undefined) ?? null);
  const standardId = useProgress((s) => (dateKey ? s.weekly[isoWeekKey(dateKey)]?.standardId : undefined) ?? null);
  return useCallback(
    (e: CatalogEntry): { href: string; now: string | null } =>
      e.id === lickId ? { href: '/', now: 'Today' } : e.id === standardId ? { href: '/week', now: 'This week' } : { href: `/lessons/${e.id}`, now: null },
    [lickId, standardId],
  );
}

/** Learned is a blue pencil tick, favourite an ink heart. Empty slots keep the marks in line. */
function Marks({ id, learned: showLearned = true, favourite: showFavourite = true }: { id: string; learned?: boolean; favourite?: boolean }) {
  const learned = useProgress((s) => Boolean(s.learned[id]));
  const favourite = useProgress((s) => Boolean(s.favourites[id]));
  return (
    <span className={styles.marks}>
      <span title={showLearned && learned ? 'Learned' : undefined}>
        {showLearned && learned ? (
          <>
            <Pencil kind="tick" className={styles.markTick} />
            <span className="visually-hidden">, learned</span>
          </>
        ) : null}
      </span>
      <span title={showFavourite && favourite ? 'Favourite' : undefined}>
        {showFavourite && favourite ? (
          <span className={styles.markHeart}>
            <Icon name="heartFilled" size={18} />
            <span className="visually-hidden">, favourite</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}

function Legend({ learned = true, favourite = true }: { learned?: boolean; favourite?: boolean }) {
  return (
    <span className={styles.legend} aria-hidden="true">
      {learned ? (
        <span>
          <Pencil kind="tick" className={styles.markTick} />
          Learned
        </span>
      ) : null}
      {favourite ? (
        <span>
          <span className={styles.markHeart}>
            <Icon name="heartFilled" size={16} />
          </span>
          Favourite
        </span>
      ) : null}
    </span>
  );
}

function PanelBar({ children, legend }: { children: ReactNode; legend?: ReactNode }) {
  return (
    <div className={styles.panelBar}>
      <p>{children}</p>
      {legend}
    </div>
  );
}

/** One row of a track list: an index column (a date or a track number), the title over its details, then marks. */
function Track({ href, index, kicker, title, meta, marks, now }: { href?: string; index?: ReactNode; kicker?: string; title: string; meta?: ReactNode; marks?: ReactNode; now?: string | null }) {
  const className = index === undefined ? `${styles.track} ${styles.trackPlain}` : styles.track;
  const body = (
    <>
      {index}
      <span className={styles.trackMain}>
        {kicker ? <span className={styles.trackKicker}>{kicker}</span> : null}
        <span className={styles.trackTitle}>{title}</span>
        {meta}
      </span>
      <span className={styles.trackSide}>
        {now ? <span className={styles.now}>{now}</span> : null}
        {marks}
        {href ? <Icon name="chevronRight" size={18} className={styles.chevron} /> : null}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** The date column: weekday over the day of the month. Today's is circled in pencil. */
function When({ date, today = false }: { date: string; today?: boolean }) {
  return (
    <span className={styles.when}>
      <span className={styles.whenDay} aria-hidden="true">
        {formatWeekday(date)}
      </span>
      <span className={styles.whenDate} aria-hidden="true">
        {Number(date.slice(8, 10))}
      </span>
      <span className="visually-hidden">{`${formatWeekday(date)} ${formatShortDate(date)}${today ? ', today' : ''}: `}</span>
      {today ? <Pencil kind="circle" draw className={styles.whenCircle} /> : null}
    </span>
  );
}

/** A bar's rest on a short staff: nothing has been played here yet. */
function RestArt() {
  return (
    <svg className={styles.emptyArt} viewBox="0 0 104 40" aria-hidden="true" focusable="false">
      {[4, 12, 20, 28, 36].map((y) => (
        <line key={y} x1="0" x2="104" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.45" />
      ))}
      <line x1="0.75" x2="0.75" y1="4" y2="36" stroke="currentColor" strokeWidth="1.5" />
      <line x1="103.25" x2="103.25" y1="4" y2="36" stroke="currentColor" strokeWidth="1.5" />
      <rect x="44" y="12" width="16" height="6" fill="currentColor" />
    </svg>
  );
}

function Empty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <RestArt />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{children}</p>
      {action}
    </div>
  );
}

function Loading() {
  return (
    <div className={styles.rowsSkeleton} aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading your progress…
      </p>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonRow} aria-hidden="true">
          <span className={ui.skeleton} />
          <span className={ui.skeleton} />
        </div>
      ))}
    </div>
  );
}

const todaysLick = (
  <Link href="/" className={`${ui.button} ${ui.primary}`}>
    Open today’s lick
  </Link>
);

function History({ byId, dateKey }: { byId: Map<string, CatalogEntry>; dateKey: string }) {
  const daily = useProgress((s) => s.daily);
  const weekly = useProgress((s) => s.weekly);
  const headId = useId();
  const weeks = useMemo(() => {
    const keys = new Set([...Object.keys(weekly), ...Object.keys(daily).map((d) => isoWeekKey(d))]);
    return [...keys]
      .sort()
      .reverse()
      .map((wk) => ({
        weekKey: wk,
        standard: weekly[wk] ? byId.get(weekly[wk].standardId) : undefined,
        review: weekly[wk]?.review,
        days: Object.entries(daily)
          .filter(([d]) => isoWeekKey(d) === wk)
          .sort(([a], [b]) => b.localeCompare(a)),
      }))
      .map((w) => ({ ...w, monday: weekDates(w.days[0]?.[0] ?? weekly[w.weekKey]?.assignedOn ?? dateKey)[0] }));
  }, [daily, weekly, byId, dateKey]);

  if (weeks.length === 0) {
    return (
      <Empty title="Nothing filed yet" action={todaysLick}>
        Each day’s lick is filed here, under that week’s standard, as soon as you open it on Today.
      </Empty>
    );
  }
  const thisWeek = isoWeekKey(dateKey);
  const lastWeek = isoWeekKey(addDays(dateKey, -7));
  return (
    <>
      <PanelBar legend={<Legend />}>Each day’s lick under that week’s standard, newest first.</PanelBar>
      <div className={styles.groups}>
        {weeks.map((w) => {
          const id = `${headId}-${w.weekKey}`;
          const recent = w.weekKey === thisWeek ? 'This week' : w.weekKey === lastWeek ? 'Last week' : null;
          const range = dateRange(w.monday, addDays(w.monday, 6));
          // The week's standard is its title; a week without one is named by its dates.
          const kicker = [w.standard ? recent : null, w.standard ? range : recent, w.review ? 'review week' : null].filter(Boolean).join(' · ');
          return (
            <section key={w.weekKey} className={styles.group} aria-labelledby={id}>
              <div className={styles.groupHead}>
                <h2 id={id} className={styles.groupTitle}>
                  {kicker ? <span className={styles.groupKicker}>{kicker}</span> : null}
                  {w.standard ? <Link href={w.weekKey === thisWeek ? '/week' : `/lessons/${w.standard.id}`}>{w.standard.title}</Link> : <span>Week of {range}</span>}
                </h2>
                {w.standard ? (
                  <div className={styles.groupSide}>
                    <span>{[byline(w.standard), prettyKey(w.standard.key)].filter(Boolean).join(' · ')}</span>
                    <Marks id={w.standard.id} />
                    <span className={styles.chevronSpace} />
                  </div>
                ) : null}
              </div>
              {w.days.length ? (
                <ul className={styles.tracks}>
                  {w.days.map(([d, a]) => {
                    const entry = byId.get(a.lickId);
                    if (!entry) return null;
                    const isToday = d === dateKey;
                    return (
                      <li key={d}>
                        <Track
                          href={isToday ? '/' : `/lessons/${entry.id}`}
                          index={<When date={d} today={isToday} />}
                          title={entry.title}
                          meta={<Details parts={[byline(entry), prettyKey(entry.key), a.review ? 'review' : null]} />}
                          now={isToday ? 'Today' : null}
                          marks={<Marks id={entry.id} />}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Learned({ byId, dateKey, place }: { byId: Map<string, CatalogEntry>; dateKey: string; place: ReturnType<typeof usePlace> }) {
  const learned = useProgress((s) => s.learned);
  const headId = useId();
  const months = useMemo(() => {
    const entries = Object.entries(learned).sort(([, a], [, b]) => b.learnedOn.localeCompare(a.learnedOn));
    const out: { month: string; items: typeof entries }[] = [];
    for (const item of entries) {
      const month = item[1].learnedOn.slice(0, 7);
      const last = out.at(-1);
      if (last?.month === month) last.items.push(item);
      else out.push({ month, items: [item] });
    }
    return out;
  }, [learned]);

  if (months.length === 0) {
    return (
      <Empty title="Nothing marked as learned yet" action={todaysLick}>
        When a lick sits under your fingers at the target tempo, press <strong>Mark lick as learned</strong> on it. It is noted here with the date and the key you played it in.
      </Empty>
    );
  }
  return (
    <>
      <PanelBar legend={<Legend learned={false} />}>Newest first, with the key you were playing in when you marked it.</PanelBar>
      <div className={styles.groups}>
        {months.map(({ month, items }) => (
          <section key={month} className={styles.group} aria-labelledby={`${headId}-${month}`}>
            <div className={styles.groupHead}>
              <h2 id={`${headId}-${month}`} className={styles.groupTitle}>
                {monthName(month, dateKey)}
              </h2>
              <p className={styles.groupSide}>{items.length} learned</p>
            </div>
            <ul className={styles.tracks}>
              {items.map(([id, e]) => {
                const entry = byId.get(id);
                const standard = entry?.standardId ? byId.get(entry.standardId) : undefined;
                const style = entry ? byline(entry) : e.artist ? `In the style of ${e.artist}` : null;
                const parts =
                  e.kind === 'lick'
                    ? [style, standard ? `for ${standard.title}` : null, e.key ? `learned in ${e.key}` : null, e.origin === 'generated' ? 'generated lesson' : null]
                    : ['Standard', entry ? byline(entry) : null];
                const where = entry ? place(entry) : null;
                return (
                  <li key={id}>
                    <Track href={where?.href} index={<When date={e.learnedOn} />} title={e.title} meta={<Details parts={parts} />} now={where?.now} marks={<Marks id={id} learned={false} />} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function Favourites({ byId, place }: { byId: Map<string, CatalogEntry>; place: ReturnType<typeof usePlace> }) {
  const favourites = useProgress((s) => s.favourites);
  const entries = useMemo(
    () =>
      Object.entries(favourites)
        .sort(([, a], [, b]) => b.addedOn.localeCompare(a.addedOn))
        .map(([id]) => byId.get(id))
        .filter((e): e is CatalogEntry => Boolean(e)),
    [favourites, byId],
  );
  if (entries.length === 0) {
    return (
      <Empty title="No favourites yet">
        Press <strong>Favourite</strong> on any lick or standard and it goes on this shelf, so the ones you love are always one click away.
      </Empty>
    );
  }
  return (
    <>
      <PanelBar legend={<Legend favourite={false} />}>The lessons you marked with the heart, newest first.</PanelBar>
      <ul className={styles.shelf}>
        {entries.map((e) => {
          const standard = e.kind === 'lick' && e.standardId ? byId.get(e.standardId) : undefined;
          const where = place(e);
          return (
            <li key={e.id}>
              <Track
                href={where.href}
                kicker={e.kind === 'standard' ? 'Standard' : standard ? `Lick · ${standard.title}` : 'Lick'}
                title={e.title}
                meta={<Details parts={[byline(e), prettyKey(e.key)]} />}
                now={where.now}
                marks={<Marks id={e.id} favourite={false} />}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}

type Kind = 'all' | 'lick' | 'standard';
type Origin = 'all' | 'seed' | 'generated';

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5l5 5" />
    </svg>
  );
}

function AllLessons({ catalog, place }: { catalog: CatalogEntry[]; place: ReturnType<typeof usePlace> }) {
  const [kind, setKind] = useState<Kind>('all');
  const [origin, setOrigin] = useState<Origin>('all');
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const searchId = useId();
  const headId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  const { groups, other, otherLetter, found } = useMemo(() => {
    const words = deferred.split(/\s+/).filter(Boolean);
    const haystack = (e: CatalogEntry, standard?: CatalogEntry) =>
      [e.title, e.artist, ...(e.composers ?? []), ...e.tags, e.key.tonic, prettyKey(e.key), standard?.title].filter(Boolean).join(' ').toLowerCase();
    const matches = (e: CatalogEntry, standard?: CatalogEntry) => (origin === 'all' || e.origin === origin) && words.every((w) => haystack(e, standard).includes(w));

    const standards = catalog.filter((e) => e.kind === 'standard').sort((a, b) => a.order - b.order);
    const grouped = new Set<string>();
    const groups = standards
      .map((s, i) => {
        const all = licksFor(catalog, s);
        all.forEach((l) => grouped.add(l.id));
        return {
          standard: s,
          letter: LETTERS[i] ?? '',
          total: all.length,
          // Track numbers follow the standard's own order, so they stay put while filtering.
          licks: kind === 'standard' ? [] : all.map((entry, n) => ({ entry, n: n + 1 })).filter(({ entry }) => matches(entry, s)),
          shown: kind !== 'lick' && matches(s),
        };
      })
      .filter((g) => g.shown || g.licks.length > 0);
    const other =
      kind === 'standard'
        ? []
        : catalog
            .filter((e) => e.kind === 'lick' && !grouped.has(e.id))
            .map((entry, n) => ({ entry, n: n + 1 }))
            .filter(({ entry }) => matches(entry));
    const licks = groups.reduce((n, g) => n + g.licks.length, 0) + other.length;
    return { groups, other, otherLetter: LETTERS[standards.length] ?? '', found: { standards: groups.filter((g) => g.shown).length, licks } };
  }, [catalog, kind, origin, deferred]);

  const generatedCount = catalog.filter((e) => e.origin === 'generated').length;
  const filtered = kind !== 'all' || origin !== 'all' || deferred !== '';
  const shown = found.standards + found.licks;
  const summary = filtered ? `${shown} of ${plural(catalog.length, 'lesson')}` : `${plural(found.standards, 'standard')} and ${plural(found.licks, 'lick')}`;
  // Clearing removes the button that was pressed, so the focus goes back to the search field.
  const clear = () => {
    setQuery('');
    setKind('all');
    setOrigin('all');
    searchRef.current?.focus();
  };

  const row = ({ entry, n }: { entry: CatalogEntry; n: number }) => {
    const where = place(entry);
    return (
      <li key={entry.id}>
        <Track
          href={where.href}
          index={<span className={styles.trackNo}>{n}</span>}
          title={entry.title}
          meta={<Details parts={[byline(entry), prettyKey(entry.key), entry.origin === 'generated' ? 'generated' : null]} difficulty={entry.difficulty} />}
          now={where.now}
          marks={<Marks id={entry.id} />}
        />
      </li>
    );
  };

  return (
    <>
      <div className={styles.toolbar}>
        <div className={`${ui.field} ${styles.toolField}`}>
          <label htmlFor={searchId}>Search</label>
          <span className={styles.searchBox}>
            <SearchIcon />
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              className={styles.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Guitarist, tune or key"
              autoComplete="off"
              spellCheck={false}
            />
          </span>
        </div>
        <div className={`${ui.field} ${styles.toolField}`}>
          <span aria-hidden="true">Show</span>
          <Segmented<Kind>
            label="Show"
            value={kind}
            options={[
              { value: 'all', label: 'All' },
              { value: 'lick', label: 'Licks' },
              { value: 'standard', label: 'Standards' },
            ]}
            onChange={setKind}
          />
        </div>
        {generatedCount > 0 ? (
          <div className={`${ui.field} ${styles.toolField}`}>
            <span aria-hidden="true">Source</span>
            <Segmented<Origin>
              label="Source"
              value={origin}
              options={[
                { value: 'all', label: 'Any' },
                { value: 'seed', label: 'Seed library' },
                { value: 'generated', label: 'Generated' },
              ]}
              onChange={setOrigin}
            />
          </div>
        ) : null}
        <p className={styles.resultCount} role="status">
          {summary}
        </p>
      </div>

      {shown === 0 ? (
        <Empty
          title={deferred ? `Nothing matches “${query.trim()}”` : 'Nothing matches these filters'}
          action={
            <button type="button" className={ui.button} onClick={clear}>
              Clear the search
            </button>
          }
        >
          Try a guitarist, a tune or a key, such as Wes, Blue Bossa or B♭.
        </Empty>
      ) : (
        <div className={styles.groups}>
          {groups.map((g) => {
            const id = `${headId}-${g.standard.id}`;
            const where = place(g.standard);
            return (
              <section key={g.standard.id} className={styles.group} aria-labelledby={id}>
                <div className={`${styles.groupHead} ${styles.groupHeadLettered}`}>
                  <span className={ui.rehearsalMark} aria-hidden="true">
                    {g.letter}
                  </span>
                  <h2 id={id} className={styles.groupTitle}>
                    <Link href={where.href}>{g.standard.title}</Link>
                  </h2>
                  <div className={styles.groupSide}>
                    {where.now ? <span className={styles.now}>{where.now}</span> : null}
                    <span>{[byline(g.standard), prettyKey(g.standard.key), plural(g.total, 'lick')].filter(Boolean).join(' · ')}</span>
                    <Marks id={g.standard.id} />
                    <span className={styles.chevronSpace} />
                  </div>
                </div>
                {g.licks.length ? <ul className={styles.tracks}>{g.licks.map(row)}</ul> : null}
              </section>
            );
          })}
          {other.length ? (
            <section className={styles.group} aria-labelledby={`${headId}-other`}>
              <div className={`${styles.groupHead} ${styles.groupHeadLettered}`}>
                <span className={ui.rehearsalMark} aria-hidden="true">
                  {otherLetter}
                </span>
                <h2 id={`${headId}-other`} className={styles.groupTitle}>
                  Other licks
                </h2>
                <div className={styles.groupSide}>{plural(other.length, 'lick')}</div>
              </div>
              <ul className={styles.tracks}>{other.map(row)}</ul>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

export function LibraryScreen({ catalog, initialTab }: { catalog: CatalogEntry[]; initialTab: LibraryTab }) {
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const dateKey = useLocalDate();
  const hydrated = useHydrated();
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const learnedCount = useProgress((s) => Object.keys(s.learned).length);
  const favouriteCount = useProgress((s) => Object.keys(s.favourites).filter((id) => byId.has(id)).length);
  const place = usePlace(dateKey);
  const tabsId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(TAB_KEY, tab);
    } catch {
      // Storage blocked: the way back from a lesson goes to All lessons.
    }
  }, [tab]);

  const select = (next: LibraryTab) => {
    setTab(next);
    window.history.replaceState(null, '', next === 'history' ? '/library' : `/library?tab=${next}`);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + step + TABS.length) % TABS.length;
    select(TABS[next].id);
    refs.current[next]?.focus();
  };

  // Counts that depend on this browser's progress appear once it has been read.
  const counts: Partial<Record<LibraryTab, number>> = hydrated ? { learned: learnedCount, favourites: favouriteCount, all: catalog.length } : { all: catalog.length };

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={`${styles.screen} ${styles.page}`}>
        <header className={styles.pageHeader}>
          <p className={ui.eyebrow}>Library</p>
          <h1 className={styles.headline}>Your back catalogue</h1>
          <p className={styles.pageIntro}>Find any lick or standard again: by the week you played it, the day you learned it, or in the whole book.</p>
        </header>
        <div className={styles.tabs} role="tablist" aria-label="Library" onKeyDown={onKeyDown}>
          {TABS.map((t, i) => {
            const selected = tab === t.id;
            const count = counts[t.id];
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${tabsId}-${t.id}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel`}
                tabIndex={selected ? 0 : -1}
                className={styles.tab}
                onClick={() => select(t.id)}
              >
                {t.label}
                {count !== undefined ? (
                  <span className={styles.tabCount}>
                    <span className="visually-hidden"> (</span>
                    {count}
                    <span className="visually-hidden">)</span>
                  </span>
                ) : null}
                {selected ? <Pencil kind="underline" draw className={styles.tabMark} /> : null}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`} className={styles.panel}>
          {tab === 'all' ? (
            <AllLessons catalog={catalog} place={place} />
          ) : !hydrated || !dateKey ? (
            <Loading />
          ) : tab === 'history' ? (
            <History byId={byId} dateKey={dateKey} />
          ) : tab === 'learned' ? (
            <Learned byId={byId} dateKey={dateKey} place={place} />
          ) : (
            <Favourites byId={byId} place={place} />
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
