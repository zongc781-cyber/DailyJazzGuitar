'use client';

// Today: the daily lick, with a link to this week's standard and today's plan day.

import Link from 'next/link';
import { Suspense, ViewTransition, use, useMemo, type ReactNode } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { lessonPromise } from '@/lib/client/lessons';
import { useSchedule, type Schedule } from '@/lib/client/useSchedule';
import { formatLongDate } from '@/lib/format';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Icon } from '@/components/ui/Icon';
import { LickLesson } from '@/components/lesson/LickLesson';
import { FOCUS_LABEL } from '@/components/standard/PracticePlan';
import { LessonSkeleton, ScreenSkeleton } from './Skeletons';
import styles from './screens.module.css';

// This week's standard and today's plan day, as a small link at the top right of the lesson.
function WeekStrip({ standardId, schedule }: { standardId: string; schedule: Schedule }) {
  const standard = use(lessonPromise(standardId));
  if (standard.kind !== 'standard') return null;
  const day = standard.practicePlan.find((d) => d.day === schedule.planDay);
  return (
    <Link href="/week" className={styles.weekStrip} data-testid="week-strip">
      <span className={styles.weekStripLabel}>{schedule.week.review ? 'This week (review)' : 'This week'}</span>
      <span className={styles.weekStripTitle}>{standard.title}</span>
      {day ? (
        <span className={styles.weekStripDay}>
          day {day.day} of 7, {FOCUS_LABEL[day.focus].toLowerCase()}
        </span>
      ) : null}
      <Icon name="chevronRight" size={16} />
    </Link>
  );
}

function TodayLick({ id, schedule, standard, week }: { id: string; schedule: Schedule; standard: CatalogEntry | undefined; week: ReactNode }) {
  const lesson = use(lessonPromise(id));
  if (lesson.kind !== 'lick') throw new Error('Today’s lesson is not a lick.');
  const eyebrow = `${schedule.day.review ? 'Review lick' : 'Today’s lick'} · ${formatLongDate(schedule.dateKey)}`;
  const forStandard = lesson.standardId && lesson.standardId === standard?.id ? { title: standard.title, href: '/week' } : null;
  return <LickLesson key={lesson.id} lesson={lesson} eyebrow={eyebrow} aside={week} standard={forStandard} review={schedule.day.review} />;
}

export function TodayScreen({ catalog }: { catalog: CatalogEntry[] }) {
  const schedule = useSchedule(catalog);
  const byId = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

  if (!schedule) return <ScreenSkeleton label="Finding today’s lesson" />;
  const { day, week } = schedule;
  if (!day.lickId) {
    return (
      <div className={styles.screen}>
        <p className={styles.emptyState}>The library has no licks yet. Run the seed build (npm run library) or publish a lesson.</p>
      </div>
    );
  }
  // Start both requests now so the lick and the week card load in parallel.
  lessonPromise(day.lickId);
  if (week.standardId) lessonPromise(week.standardId);

  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.screen}>
        <ErrorBoundary>
          <Suspense fallback={<LessonSkeleton />}>
            <TodayLick
              id={day.lickId}
              schedule={schedule}
              standard={week.standardId ? byId.get(week.standardId) : undefined}
              week={
                week.standardId ? (
                  <ErrorBoundary fallback={null}>
                    <Suspense fallback={null}>
                      <WeekStrip standardId={week.standardId} schedule={schedule} />
                    </Suspense>
                  </ErrorBoundary>
                ) : null
              }
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </ViewTransition>
  );
}
