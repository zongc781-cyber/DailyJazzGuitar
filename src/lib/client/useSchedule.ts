'use client';

// Today's lick and this week's standard for this browser. The picks are computed from the
// catalogue and the saved assignments, then saved, so they stay put for the rest of the local day
// and week.

import { useEffect, useMemo } from 'react';
import type { CatalogEntry } from '@/lib/music/types';
import { isoWeekKey, pickDay, pickWeek, planDay, type DayPick, type WeekPick } from '@/lib/schedule';
import { saveDailyAssignment, saveWeeklyAssignment } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { useLocalDate } from './useLocalDate';

export interface Schedule {
  dateKey: string;
  weekKey: string;
  week: WeekPick;
  day: DayPick;
  /** Day 1-7 of the standard's seven-day plan. */
  planDay: number;
}

export function useSchedule(catalog: CatalogEntry[]): Schedule | null {
  const dateKey = useLocalDate();
  const weekly = useProgress((s) => s.weekly);
  const daily = useProgress((s) => s.daily);

  const schedule = useMemo(() => {
    if (!dateKey) return null;
    const week = pickWeek(catalog, weekly, dateKey);
    const day = pickDay(catalog, daily, dateKey, week.standardId);
    return { dateKey, weekKey: isoWeekKey(dateKey), week, day, planDay: planDay(week.startedOn, dateKey) };
  }, [catalog, weekly, daily, dateKey]);

  // Saving is a side effect of showing the lesson, so it happens after render.
  useEffect(() => {
    if (!schedule) return;
    const { week, day, dateKey: date, weekKey } = schedule;
    const now = new Date().toISOString();
    if (week.isNew && week.standardId) {
      saveWeeklyAssignment(weekKey, { standardId: week.standardId, assignedOn: date, assignedAt: now, ...(week.review ? { review: true } : {}) });
    }
    if (day.isNew && day.lickId) {
      saveDailyAssignment(date, { lickId: day.lickId, standardId: week.standardId, assignedAt: now, ...(day.review ? { review: true } : {}) });
    }
  }, [schedule]);

  return schedule;
}
