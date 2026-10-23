'use client';

// Library: every lesson, under a huge title on a white page. History files each day's lick under
// that week's standard, Learned lists what was marked as learned with the date and the key,
// Favourites lists the hearted lessons, and All lessons is the whole book, grouped by standard,
// with search and filters. Each list is rows on hairlines, and every row is a link.

import Link from 'next/link';
import { ViewTransition, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { prettyKey } from '@/lib/music/pretty';
import { licksFor } from '@/lib/catalog';
import { formatShortDate, formatWeekday } from '@/lib/format';
import { addDays, isoWeekKey, weekDates } from '@/lib/schedule';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { useHydrated, useProgress } from '@/lib/progress/store';
import { Hero } from '@/components/ui/Hero';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import ui from '@/components/ui/ui.module.css';
import styles from './library.module.css';

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
    <span className={styles.details}>
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

function LearnedMark() {
  return (
    <span className={`${styles.mark} ${styles.learned}`}>
      <Icon name="check" size={15} />
    </span>
  );
}

function FavouriteMark() {
  return (
    <span className={`${styles.mark} ${styles.favourite}`}>
      <Icon name="heartFilled" size={21} />
    </span>
  );
}

/** Learned and favourite, in one column. Empty slots keep the marks in line down a list. */
function Marks({ id, learned: showLearned = true, favourite: showFavourite = true }: { id: string; learned?: boolean; favourite?: boolean }) {
  const learned = useProgress((s) => showLearned && Boolean(s.learned[id]));
  const favourite = useProgress((s) => showFavourite && Boolean(s.favourites[id]));
  return (
    <span className={styles.marks}>
      <span title={learned ? 'Learned' : undefined}>
        {learned ? (
          <>
            <LearnedMark />
            <span className="visually-hidden">, learned</span>
          </>
        ) : null}
      </span>
      <span title={favourite ? 'Favourite' : undefined}>
        {favourite ? (
          <>
            <FavouriteMark />
            <span className="visually-hidden">, favourite</span>
          </>
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
          <LearnedMark />
          Learned
        </span>
      ) : null}
      {favourite ? (
        <span>
          <FavouriteMark />
          Favourite
        </span>
      ) : null}
    </span>
  );
}

/** What a tab holds, in one line, with a key to its marks. */
function Intro({ children, legend }: { children: ReactNode; legend?: ReactNode }) {
  return (
    <div className={styles.intro}>
      <p>{children}</p>
      {legend}
    </div>
  );
}

/**
 * One line of a list: a small index, the title over its details, today's place, the marks and an
 * arrow that appears on hover. With an href the whole line is a link. With a headingId it is the
 * head of a group, set very large, and its kicker and title are the group's heading.
 */
function Line({
  href,
  index,
  kicker,
  title,
  details,
  now,
  marks,
  headingId,
}: {
  href?: string;
  index?: ReactNode;
  kicker?: string;
  title: string;
  details?: ReactNode;
  now?: string | null;
  marks?: ReactNode;
  headingId?: string;
}) {
  const className = `${styles.line} ${headingId ? styles.groupLine : styles.row}`;
  const name = (
    <>
      {kicker ? <span className={styles.kicker}>{kicker}</span> : null}
      <span className={styles.title}>{title}</span>
    </>
  );
  const body = (
    <>
      <span className={styles.index}>{index}</span>
      <div className={styles.main}>
        {headingId ? (
          <h2 id={headingId} className={styles.heading}>
            {name}
          </h2>
        ) : (
          name
        )}
        {details}
      </div>
      <span className={styles.now}>{now}</span>
      {marks ?? <span />}
      <span className={styles.arrow} aria-hidden="true">
        {href ? <Icon name="arrowRight" size={30} /> : null}
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

/** A row's date: "Thu 22" on screen, the full date for screen readers. Today's is blue. */
function When({ date, today = false, short = false }: { date: string; today?: boolean; short?: boolean }) {
  return (
    <span className={today ? styles.today : undefined}>
      <span aria-hidden="true">{short ? formatShortDate(date) : `${formatWeekday(date)} ${Number(date.slice(8, 10))}`}</span>
      <span className="visually-hidden">{`${formatWeekday(date)} ${formatShortDate(date)}: `}</span>
    </span>
  );
}

/** Nothing here yet: one big sentence and what to do about it. */
function Empty({ children, hint, action }: { children: ReactNode; hint?: string; action: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyText}>{children}</p>
      {hint ? <p className={styles.emptyHint}>{hint}</p> : null}
      {action}
    </div>
  );
}

function Loading() {
  return (
    <div className={styles.loading} aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading your progress…
      </p>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.loadingRow} aria-hidden="true">
          <span className={ui.skeleton} />
          <span className={ui.skeleton} />
        </div>
      ))}
    </div>
  );
}

const todaysLick = (
  <Link href="/" className={`${ui.button} ${ui.primary} ${ui.large}`}>
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

  if (weeks.length === 0) return <Empty action={todaysLick}>Open today’s lick and it is filed here, under this week’s standard.</Empty>;
  const thisWeek = isoWeekKey(dateKey);
  const lastWeek = isoWeekKey(addDays(dateKey, -7));
  return (
    <>
      <Intro legend={<Legend />}>Each day’s lick under that week’s standard, newest first.</Intro>
      <div className={styles.groups}>
        {weeks.map((w) => {
          const id = `${headId}-${w.weekKey}`;
          const recent = w.weekKey === thisWeek ? 'This week' : w.weekKey === lastWeek ? 'Last week' : null;
          const range = dateRange(w.monday, addDays(w.monday, 6));
          // The week's standard is its title; a week without one is named by its dates.
          const kicker = [w.standard ? recent : null, w.standard ? range : recent, w.review ? 'review week' : null].filter(Boolean).join(' · ');
          return (
            <section key={w.weekKey} className={styles.group} aria-labelledby={id}>
              <Line
                headingId={id}
                href={w.standard ? (w.weekKey === thisWeek ? '/week' : `/lessons/${w.standard.id}`) : undefined}
                kicker={kicker || undefined}
                title={w.standard ? w.standard.title : `Week of ${range}`}
                details={w.standard ? <Details parts={[byline(w.standard), prettyKey(w.standard.key)]} /> : null}
                marks={w.standard ? <Marks id={w.standard.id} /> : null}
              />
              {w.days.length ? (
                <ul className={styles.rows}>
                  {w.days.map(([d, a]) => {
                    const entry = byId.get(a.lickId);
                    if (!entry) return null;
                    const isToday = d === dateKey;
                    return (
                      <li key={d}>
                        <Line
                          href={isToday ? '/' : `/lessons/${entry.id}`}
                          index={<When date={d} today={isToday} />}
                          title={entry.title}
                          details={<Details parts={[byline(entry), prettyKey(entry.key), a.review ? 'review' : null]} />}
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

  if (months.length === 0) return <Empty action={todaysLick}>Mark a lick as learned and it is kept here, with the date and the key.</Empty>;
  return (
    <>
      <Intro legend={<Legend learned={false} />}>Newest first, with the key you were playing in when you marked it.</Intro>
      <div className={styles.groups}>
        {months.map(({ month, items }) => (
          <section key={month} className={styles.group} aria-labelledby={`${headId}-${month}`}>
            <Line headingId={`${headId}-${month}`} title={monthName(month, dateKey)} details={<span className={styles.details}>{`${items.length} learned`}</span>} />
            <ul className={styles.rows}>
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
                    <Line
                      href={where?.href}
                      index={<When date={e.learnedOn} />}
                      title={e.title}
                      details={<Details parts={parts} />}
                      now={where?.now}
                      marks={<Marks id={id} learned={false} />}
                    />
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

function Favourites({ byId, place, onBrowse }: { byId: Map<string, CatalogEntry>; place: ReturnType<typeof usePlace>; onBrowse: () => void }) {
  const favourites = useProgress((s) => s.favourites);
  const entries = useMemo(
    () =>
      Object.entries(favourites)
        .sort(([, a], [, b]) => b.addedOn.localeCompare(a.addedOn))
        .map(([id, f]) => ({ entry: byId.get(id), addedOn: f.addedOn }))
        .filter((f): f is { entry: CatalogEntry; addedOn: string } => Boolean(f.entry)),
    [favourites, byId],
  );
  if (entries.length === 0) {
    return (
      <Empty
        action={
          <button type="button" className={`${ui.button} ${ui.primary} ${ui.large}`} onClick={onBrowse}>
            Browse all lessons
          </button>
        }
      >
        Heart a lick or a standard and it waits for you here.
      </Empty>
    );
  }
  return (
    <>
      <Intro legend={<Legend favourite={false} />}>The lessons you marked with the heart, newest first.</Intro>
      <ul className={`${styles.rows} ${styles.flat}`}>
        {entries.map(({ entry: e, addedOn }) => {
          const standard = e.kind === 'lick' && e.standardId ? byId.get(e.standardId) : undefined;
          const where = place(e);
          return (
            <li key={e.id}>
              <Line
                href={where.href}
                index={<When date={addedOn} short />}
                kicker={e.kind === 'standard' ? 'Standard' : standard ? `Lick · ${standard.title}` : 'Lick'}
                title={e.title}
                details={<Details parts={[byline(e), prettyKey(e.key)]} />}
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
    <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
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
        <Line
          href={where.href}
          index={String(n).padStart(2, '0')}
          title={entry.title}
          details={<Details parts={[byline(entry), prettyKey(entry.key), entry.origin === 'generated' ? 'generated' : null]} difficulty={entry.difficulty} />}
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
          <span className={styles.searchLine}>
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
          hint="Try a guitarist, a tune or a key, such as Wes, Blue Bossa or B♭."
          action={
            <button type="button" className={`${ui.button} ${ui.primary} ${ui.large}`} onClick={clear}>
              Clear the search
            </button>
          }
        >
          {deferred ? `Nothing matches “${query.trim()}”.` : 'Nothing matches these filters.'}
        </Empty>
      ) : (
        <div className={styles.groups}>
          {groups.map((g) => {
            const id = `${headId}-${g.standard.id}`;
            const where = place(g.standard);
            return (
              <section key={g.standard.id} className={styles.group} aria-labelledby={id}>
                <Line
                  headingId={id}
                  href={where.href}
                  index={g.letter}
                  title={g.standard.title}
                  details={<Details parts={[byline(g.standard), prettyKey(g.standard.key), plural(g.total, 'lick')]} />}
                  now={where.now}
                  marks={<Marks id={g.standard.id} />}
                />
                {g.licks.length ? <ul className={styles.rows}>{g.licks.map(row)}</ul> : null}
              </section>
            );
          })}
          {other.length ? (
            <section className={styles.group} aria-labelledby={`${headId}-other`}>
              <Line headingId={`${headId}-other`} index={otherLetter} title="Other licks" details={<span className={styles.details}>{plural(other.length, 'lick')}</span>} />
              <ul className={styles.rows}>{other.map(row)}</ul>
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
  const historyCount = useProgress((s) => Object.values(s.daily).filter((a) => byId.has(a.lickId)).length);
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
  const counts: Partial<Record<LibraryTab, number>> = hydrated
    ? { history: historyCount, learned: learnedCount, favourites: favouriteCount, all: catalog.length }
    : { all: catalog.length };
  const standards = catalog.filter((e) => e.kind === 'standard').length;

  const tabs = (
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
            <span className={styles.tabLabel}>{t.label}</span>
            {count !== undefined ? (
              <span className={styles.tabCount}>
                <span className="visually-hidden"> (</span>
                {count}
                <span className="visually-hidden">)</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.library}>
        <Hero
          tone="plain"
          top={
            <>
              <span>Back catalogue</span>
              <span>{`${plural(standards, 'standard')} · ${plural(catalog.length - standards, 'lick')}`}</span>
            </>
          }
          title="Library"
          actions={tabs}
        >
          <p>Everything you’ve played, learned and loved.</p>
        </Hero>
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
            <Favourites
              byId={byId}
              place={place}
              onBrowse={() => {
                select('all');
                refs.current[TABS.length - 1]?.focus();
              }}
            />
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
