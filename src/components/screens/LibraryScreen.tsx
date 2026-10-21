'use client';

// Library: lesson history by day, the learned memo, favourites and every published lesson.

import Link from 'next/link';
import { ViewTransition, useDeferredValue, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { prettyKey } from '@/lib/music/pretty';
import { licksFor } from '@/lib/catalog';
import { formatDate, formatShortDate, formatWeekday } from '@/lib/format';
import { isoWeekKey, weekDates } from '@/lib/schedule';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { useHydrated, useProgress } from '@/lib/progress/store';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { OriginBadge } from '@/components/lesson/LessonBadges';
import ui from '@/components/ui/ui.module.css';
import styles from './screens.module.css';

export type LibraryTab = 'history' | 'learned' | 'favourites' | 'all';

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'learned', label: 'Learned' },
  { id: 'favourites', label: 'Favourites' },
  { id: 'all', label: 'All lessons' },
];

function LessonRow({ entry, href, meta, today }: { entry: CatalogEntry; href?: string; meta?: string; today?: boolean }) {
  const learned = useProgress((s) => Boolean(s.learned[entry.id]));
  const favourite = useProgress((s) => Boolean(s.favourites[entry.id]));
  const sub =
    entry.kind === 'lick'
      ? [entry.artist ? `In the style of ${entry.artist}` : null, prettyKey(entry.key)].filter(Boolean).join(' · ')
      : [entry.composers?.join(' and '), prettyKey(entry.key)].filter(Boolean).join(' · ');
  return (
    <Link href={href ?? `/lessons/${entry.id}`} className={styles.row}>
      <span className={styles.rowIcon} aria-hidden="true">
        <Icon name={entry.kind === 'lick' ? 'note' : 'book'} size={20} />
      </span>
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{entry.title}</span>
        <span className={styles.rowSub}>
          {meta ? `${meta} · ` : ''}
          {sub}
        </span>
      </span>
      <span className={styles.rowMarks}>
        {today ? <span className={`${ui.badge} ${ui.badgeSeed}`}>Today</span> : null}
        {entry.origin === 'generated' ? <OriginBadge origin="generated" /> : null}
        {learned ? (
          <span className={styles.rowLearned} title="Learned">
            <Icon name="checkCircle" size={18} />
            <span className="visually-hidden">Learned</span>
          </span>
        ) : null}
        {favourite ? (
          <span className={styles.rowFavourite} title="Favourite">
            <Icon name="heartFilled" size={18} />
            <span className="visually-hidden">Favourite</span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function History({ byId, dateKey }: { byId: Map<string, CatalogEntry>; dateKey: string }) {
  const daily = useProgress((s) => s.daily);
  const weekly = useProgress((s) => s.weekly);
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

  if (weeks.length === 0) return <p className={ui.empty}>Each day’s lick and each week’s standard will appear here once you have opened them.</p>;
  return (
    <ol className={styles.history}>
      {weeks.map((w) => {
        return (
          <li key={w.weekKey} className={styles.historyWeek}>
            <h3 className={styles.historyHeading}>
              Week of {formatShortDate(w.monday)}
              {w.standard ? ` · ${w.standard.title}` : ''}
              {w.review ? ' (review)' : ''}
            </h3>
            <ul className={styles.rows}>
              {w.standard ? (
                <li>
                  <LessonRow entry={w.standard} href={w.weekKey === isoWeekKey(dateKey) ? '/week' : undefined} meta="Weekly standard" />
                </li>
              ) : null}
              {w.days.map(([d, a]) => {
                const entry = byId.get(a.lickId);
                if (!entry) return null;
                const isToday = d === dateKey;
                return (
                  <li key={d}>
                    <LessonRow entry={entry} href={isToday ? '/' : undefined} meta={`${formatWeekday(d)} ${formatShortDate(d)}${a.review ? ' (review)' : ''}`} today={isToday} />
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function Learned({ byId }: { byId: Map<string, CatalogEntry> }) {
  const learned = useProgress((s) => s.learned);
  const entries = Object.entries(learned).sort(([, a], [, b]) => b.learnedOn.localeCompare(a.learnedOn));
  const licks = entries.filter(([, e]) => e.kind === 'lick');
  const standards = entries.filter(([, e]) => e.kind === 'standard');
  if (entries.length === 0) {
    return <p className={ui.empty}>Press “Mark lick as learned” on a lesson and it is noted here with the date and the key you played it in.</p>;
  }
  const list = (items: typeof entries) => (
    <ul className={styles.memo}>
      {items.map(([id, e]) => {
        const inLibrary = byId.has(id);
        const body = (
          <>
            <span className={styles.memoDate}>{formatDate(e.learnedOn)}</span>
            <span className={styles.memoMain}>
              <span className={styles.rowTitle}>{e.title}</span>
              <span className={styles.rowSub}>{[e.artist ? `In the style of ${e.artist}` : null, e.key ? `played in ${e.key}` : null, e.origin === 'generated' ? 'generated lesson' : null].filter(Boolean).join(' · ')}</span>
            </span>
          </>
        );
        return (
          <li key={id}>
            {inLibrary ? (
              <Link href={`/lessons/${id}`} className={styles.memoRow}>
                {body}
                <Icon name="chevronRight" size={18} />
              </Link>
            ) : (
              <div className={styles.memoRow}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className={styles.memoGroups}>
      <section>
        <h3 className={styles.groupTitle}>
          Licks <span className="num">({licks.length})</span>
        </h3>
        {licks.length ? list(licks) : <p className={styles.groupEmpty}>No licks marked as learned yet.</p>}
      </section>
      {standards.length ? (
        <section>
          <h3 className={styles.groupTitle}>
            Standards <span className="num">({standards.length})</span>
          </h3>
          {list(standards)}
        </section>
      ) : null}
    </div>
  );
}

function Favourites({ byId }: { byId: Map<string, CatalogEntry> }) {
  const favourites = useProgress((s) => s.favourites);
  const entries = Object.entries(favourites)
    .sort(([, a], [, b]) => b.addedOn.localeCompare(a.addedOn))
    .map(([id]) => byId.get(id))
    .filter((e): e is CatalogEntry => Boolean(e));
  if (entries.length === 0) return <p className={ui.empty}>Tap the heart on any lesson to keep it here.</p>;
  return (
    <ul className={styles.rows}>
      {entries.map((e) => (
        <li key={e.id}>
          <LessonRow entry={e} />
        </li>
      ))}
    </ul>
  );
}

function AllLessons({ catalog }: { catalog: CatalogEntry[] }) {
  const [origin, setOrigin] = useState<'all' | 'seed' | 'generated'>('all');
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const searchId = useId();

  const groups = useMemo(() => {
    const match = (e: CatalogEntry) =>
      (origin === 'all' || e.origin === origin) &&
      (!deferred || [e.title, e.artist, ...(e.composers ?? []), ...e.tags, e.key.tonic].some((s) => s?.toLowerCase().includes(deferred)));
    const standards = catalog.filter((e) => e.kind === 'standard').sort((a, b) => a.order - b.order);
    const grouped = new Set<string>();
    const out = standards.map((s) => {
      const licks = licksFor(catalog, s);
      licks.forEach((l) => grouped.add(l.id));
      return { standard: s, licks: licks.filter(match), showStandard: match(s) };
    });
    const other = catalog.filter((e) => e.kind === 'lick' && !grouped.has(e.id) && match(e));
    return { out: out.filter((g) => g.showStandard || g.licks.length), other };
  }, [catalog, origin, deferred]);

  const seedCount = catalog.filter((e) => e.origin === 'seed').length;
  const generatedCount = catalog.length - seedCount;

  return (
    <div className={styles.allLessons}>
      <div className={styles.filters}>
        <div className={ui.field}>
          <label htmlFor={searchId}>Search</label>
          <input
            id={searchId}
            type="search"
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, guitarist, composer…"
            autoComplete="off"
          />
        </div>
        <Segmented
          label="Source"
          value={origin}
          options={[
            { value: 'all', label: `All ${catalog.length}` },
            { value: 'seed', label: `Seed ${seedCount}` },
            { value: 'generated', label: `Generated ${generatedCount}` },
          ]}
          onChange={setOrigin}
        />
      </div>
      {groups.out.length === 0 && groups.other.length === 0 ? <p className={ui.empty}>No lessons match.</p> : null}
      {groups.out.map(({ standard, licks, showStandard }) => (
        <section key={standard.id} className={styles.group}>
          <h3 className={styles.groupTitle}>{standard.title}</h3>
          <ul className={styles.rows}>
            {showStandard ? (
              <li>
                <LessonRow entry={standard} meta="Weekly standard" />
              </li>
            ) : null}
            {licks.map((l) => (
              <li key={l.id}>
                <LessonRow entry={l} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.other.length ? (
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Other licks</h3>
          <ul className={styles.rows}>
            {groups.other.map((l) => (
              <li key={l.id}>
                <LessonRow entry={l} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function LibraryScreen({ catalog, initialTab }: { catalog: CatalogEntry[]; initialTab: LibraryTab }) {
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const dateKey = useLocalDate();
  const hydrated = useHydrated();
  const learnedCount = useProgress((s) => Object.values(s.learned).filter((e) => e.kind === 'lick').length);
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);
  const tabsId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const lickTotal = catalog.filter((e) => e.kind === 'lick').length;

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

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.screen}>
        <header className={styles.pageHeader}>
          <p className={ui.eyebrow}>Library</p>
          <h1>Your lessons</h1>
          <p className={styles.pageIntro}>
            {hydrated ? `${learnedCount} of ${lickTotal} licks learned. ` : ''}
            Every lesson you have been given, the ones you have learned, your favourites and the full library.
          </p>
        </header>
        <div className={styles.tabs} role="tablist" aria-label="Library views" onKeyDown={onKeyDown}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${tabsId}-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${tabsId}-panel`}
              tabIndex={tab === t.id ? 0 : -1}
              className={styles.tab}
              onClick={() => select(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`} className={styles.tabPanel}>
          {tab === 'all' ? (
            <AllLessons catalog={catalog} />
          ) : !hydrated || !dateKey ? (
            <p className={ui.muted}>Loading your progress…</p>
          ) : tab === 'history' ? (
            <History byId={byId} dateKey={dateKey} />
          ) : tab === 'learned' ? (
            <Learned byId={byId} />
          ) : (
            <Favourites byId={byId} />
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
