'use client';

// This Week: the weekly standard with today's day of the seven-day plan first, and a link back to
// today's lick at the top right (as Today links here).

import Link from 'next/link';
import { Suspense, ViewTransition, use, useMemo } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { licksFor } from '@/lib/catalog';
import { lessonPromise } from '@/lib/client/lessons';
import { useSchedule, type Schedule } from '@/lib/client/useSchedule';
import { formatShortDate } from '@/lib/format';
import { weekDates } from '@/lib/schedule';
import { useProgress } from '@/lib/progress/store';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Icon } from '@/components/ui/Icon';
import { StandardLesson, type WeekLick } from '@/components/standard/StandardLesson';
import { LessonSkeleton, ScreenSkeleton } from './Skeletons';
import styles from './screens.module.css';

/** Today's lick, as a small link at the top right of the week. */
function TodayLickLink({ lick, review }: { lick: CatalogEntry; review: boolean }) {
  return (
    <Link href="/" className={styles.weekStrip}>
      <span className={styles.weekStripLabel}>{review ? 'Today’s lick (review)' : 'Today’s lick'}</span>
      <span className={styles.weekStripTitle}>{lick.title}</span>
      <Icon name="chevronRight" size={16} />
    </Link>
  );
}

function WeekStandard({ schedule, catalog }: { schedule: Schedule; catalog: CatalogEntry[] }) {
  const standardId = schedule.week.standardId!;
  const standard = use(lessonPromise(standardId));
  const daily = useProgress((s) => s.daily);
  if (standard.kind !== 'standard') throw new Error('This week’s lesson is not a standard.');

  const entry = catalog.find((e) => e.id === standardId);
  const played = new Set(
    Object.entries(daily)
      .filter(([d]) => d < schedule.dateKey)
      .map(([, a]) => a.lickId),
  );
  const licks: WeekLick[] = licksFor(catalog, entry).map((l) => ({
    id: l.id,
    title: l.title,
    artist: l.artist,
    inspirationType: l.inspirationType,
    href: l.id === schedule.day.lickId ? '/' : `/lessons/${l.id}`,
    status: l.id === schedule.day.lickId ? 'today' : played.has(l.id) ? 'done' : 'upcoming',
  }));
  const todayLick = schedule.day.lickId ? catalog.find((e) => e.id === schedule.day.lickId && e.kind === 'lick') : undefined;
  const days = weekDates(schedule.dateKey);
  const eyebrow = `${schedule.week.review ? 'Review week' : 'This week'} · ${formatShortDate(days[0])} to ${formatShortDate(days[6])} · Day ${schedule.planDay} of 7`;
  return (
    <StandardLesson
      key={standard.id}
      standard={standard}
      eyebrow={eyebrow}
      aside={todayLick ? <TodayLickLink lick={todayLick} review={schedule.day.review} /> : null}
      weekKey={schedule.weekKey}
      todayDay={schedule.planDay}
      licks={licks}
      review={schedule.week.review}
    />
  );
}

export function WeekScreen({ catalog }: { catalog: CatalogEntry[] }) {
  const schedule = useSchedule(catalog);
  const hasStandard = useMemo(() => catalog.some((e) => e.kind === 'standard'), [catalog]);

  if (!schedule) return <ScreenSkeleton label="Finding this week’s standard" />;
  if (!schedule.week.standardId || !hasStandard) {
    return (
      <div className={styles.screen}>
        <p className={styles.emptyState}>The library has no standards yet.</p>
      </div>
    );
  }
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.screen}>
        <ErrorBoundary>
          <Suspense fallback={<LessonSkeleton />}>
            <WeekStandard schedule={schedule} catalog={catalog} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </ViewTransition>
  );
}
