'use client';

// A lesson opened from the library: the same lick or standard view as Today and This Week, under a
// link back to the library tab it was opened from.

import Link from 'next/link';
import { ViewTransition, useSyncExternalStore } from 'react';
import type { Lesson } from '@/lib/music/types';
import { isoWeekKey } from '@/lib/schedule';
import { useLocalDate } from '@/lib/client/useLocalDate';
import { Icon } from '@/components/ui/Icon';
import { LickLesson } from '@/components/lesson/LickLesson';
import { StandardLesson, type WeekLick } from '@/components/standard/StandardLesson';
import styles from './screens.module.css';

// The library keeps its open tab under this key (see LibraryScreen).
const TAB_KEY = 'djg:library-tab';
const TAB_NAMES: Record<string, string> = { history: 'History', learned: 'Learned', favourites: 'Favourites', all: 'All lessons' };

const noSubscription = () => () => {};

function lastLibraryTab(): string | null {
  try {
    const tab = window.sessionStorage.getItem(TAB_KEY);
    return tab && Object.hasOwn(TAB_NAMES, tab) ? tab : null;
  } catch {
    return null;
  }
}

/** "‹ Library / Learned": back to the tab the lesson was opened from, or to All lessons. */
function BackToLibrary() {
  const tab = useSyncExternalStore(noSubscription, lastLibraryTab, () => null);
  const href = tab === 'history' ? '/library' : `/library?tab=${tab ?? 'all'}`;
  return (
    <Link href={href} className={styles.back}>
      <Icon name="chevronRight" size={18} className={styles.backIcon} />
      Library
      {/* The space keeps the link's name "Library All lessons"; the slash is drawn by CSS. */}
      {tab ? <span className={styles.backTab}>{` ${TAB_NAMES[tab]}`}</span> : null}
    </Link>
  );
}

export function LessonScreen({ lesson, standard, licks }: { lesson: Lesson; standard: { title: string; href: string } | null; licks: WeekLick[] }) {
  const dateKey = useLocalDate();
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div className={styles.screen}>
        <BackToLibrary />
        {lesson.kind === 'lick' ? (
          <LickLesson key={lesson.id} lesson={lesson} eyebrow={lesson.origin === 'generated' ? 'Generated lick' : 'Daily lick'} standard={standard} />
        ) : (
          <StandardLesson key={lesson.id} standard={lesson} eyebrow="Weekly standard" weekKey={dateKey ? isoWeekKey(dateKey) : null} todayDay={null} licks={licks} />
        )}
      </div>
    </ViewTransition>
  );
}
