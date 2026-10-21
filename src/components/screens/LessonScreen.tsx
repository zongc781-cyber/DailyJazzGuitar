'use client';

// A lesson opened from the library: the same lick or standard view as Today and This Week.

import Link from 'next/link';
import { ViewTransition } from 'react';
import type { Lesson } from '@/lib/music/types';
import { isoWeekKey } from '@/lib/schedule';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { Icon } from '@/components/ui/Icon';
import { LickLesson } from '@/components/lesson/LickLesson';
import { StandardLesson, type WeekLick } from '@/components/standard/StandardLesson';
import styles from './screens.module.css';

export function LessonScreen({ lesson, standard, licks }: { lesson: Lesson; standard: { title: string; href: string } | null; licks: WeekLick[] }) {
  const dateKey = useLocalDate();
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.screen}>
        <Link href="/library?tab=all" className={styles.back}>
          <Icon name="chevronRight" size={18} className={styles.backIcon} />
          Library
        </Link>
        {lesson.kind === 'lick' ? (
          <LickLesson key={lesson.id} lesson={lesson} eyebrow={lesson.origin === 'generated' ? 'Generated lick' : 'Daily lick'} standard={standard} />
        ) : (
          <StandardLesson key={lesson.id} standard={lesson} eyebrow="Weekly standard" weekKey={dateKey ? isoWeekKey(dateKey) : null} todayDay={null} licks={licks} />
        )}
      </div>
    </ViewTransition>
  );
}
