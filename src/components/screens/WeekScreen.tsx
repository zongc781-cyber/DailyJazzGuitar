'use client';

// This Week: the weekly standard with today's day of the seven-day plan first, ending on a link to
// today's lick (as Today ends on a link here).

import { Suspense, ViewTransition, use, useMemo } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { licksFor } from '@/lib/catalog';
import { lessonPromise } from '@/lib/client/lessons';
import { useSchedule, type Schedule } from '@/lib/client/useSchedule';
import { formatShortDate } from '@/lib/format';
import { weekDates } from '@/lib/schedule';
import { useProgress } from '@/lib/progress/store';
import { curly } from '@/lib/text';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Hero } from '@/components/ui/Hero';
import { NextLink } from '@/components/ui/NextLink';
import { StandardLesson, type WeekLick } from '@/components/standard/StandardLesson';
import { LessonSkeleton, ScreenSkeleton } from './Skeletons';
import styles from './screens.module.css';

/** "19 to 25 Oct", or "28 Sep to 4 Oct" when the week spans two months. */
function weekRange(first: string, last: string) {
  return first.slice(0, 7) === last.slice(0, 7) ? `${Number(first.slice(8, 10))} to ${formatShortDate(last)}` : `${formatShortDate(first)} to ${formatShortDate(last)}`;
}

/** The last two words kept together, so a big title never ends on one word alone. */
function noWidow(title: string) {
  return title.replace(/ (\S+)$/, ' $1');
}

/** Who the lick is after, as the lick's own page says it. */
function byline(lick: CatalogEntry) {
  if (!lick.artist) return undefined;
  return !lick.inspirationType || lick.inspirationType === 'in-the-style-of' ? `In the style of ${lick.artist}` : `After ${lick.artist}`;
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
  const eyebrow = `${schedule.week.review ? 'Review week' : 'This week'} · ${weekRange(days[0], days[6])} · Day ${schedule.planDay} of 7`;
  return (
    <StandardLesson
      key={standard.id}
      standard={standard}
      eyebrow={eyebrow}
      weekKey={schedule.weekKey}
      todayDay={schedule.planDay}
      licks={licks}
      next={
        todayLick ? (
          <NextLink href="/" label={schedule.day.review ? 'Today’s lick, a review' : 'Today’s lick'} title={noWidow(curly(todayLick.title))} meta={byline(todayLick)} testId="lick-next" />
        ) : null
      }
    />
  );
}

export function WeekScreen({ catalog }: { catalog: CatalogEntry[] }) {
  const schedule = useSchedule(catalog);
  const hasStandard = useMemo(() => catalog.some((e) => e.kind === 'standard'), [catalog]);

  if (!schedule) return <ScreenSkeleton label="Finding this week’s standard" />;
  if (!schedule.week.standardId || !hasStandard) {
    return (
      <div className={styles.full}>
        <Hero top="This week" title="No standard yet">
          <p>The library has no standards yet. Run the seed build (npm run library) or publish a lesson.</p>
        </Hero>
      </div>
    );
  }
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.full}>
        <ErrorBoundary>
          <Suspense fallback={<LessonSkeleton />}>
            <WeekStandard schedule={schedule} catalog={catalog} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </ViewTransition>
  );
}
