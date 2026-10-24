'use client';

// Every change to the learner's progress goes through these functions, so the stored shape stays
// consistent. Each one is an immutable update of ProgressState.

import { updateProgress } from './store';
import type { DailyAssignment, LearnedEntry, Preferences, WeeklyAssignment } from './state';

const nowIso = () => new Date().toISOString();

export function saveWeeklyAssignment(weekKey: string, a: WeeklyAssignment) {
  updateProgress((s) => (s.weekly[weekKey] ? s : { ...s, weekly: { ...s.weekly, [weekKey]: a } }));
}

export function saveDailyAssignment(dateKey: string, a: DailyAssignment) {
  updateProgress((s) => (s.daily[dateKey] ? s : { ...s, daily: { ...s.daily, [dateKey]: a } }));
}

export function setLearned(id: string, entry: LearnedEntry | null) {
  updateProgress((s) => {
    const learned = { ...s.learned };
    if (entry) learned[id] = entry;
    else delete learned[id];
    return { ...s, learned };
  });
}

export function setFavourite(id: string, on: boolean, dateKey: string) {
  updateProgress((s) => {
    const favourites = { ...s.favourites };
    if (on) favourites[id] = { addedOn: dateKey };
    else delete favourites[id];
    return { ...s, favourites };
  });
}

export function togglePracticeItem(dateKey: string, lessonId: string, itemId: string) {
  updateProgress((s) => {
    const day = s.practice[dateKey] ?? {};
    const items = day[lessonId] ?? [];
    const next = items.includes(itemId) ? items.filter((x) => x !== itemId) : [...items, itemId];
    return { ...s, practice: { ...s.practice, [dateKey]: { ...day, [lessonId]: next } } };
  });
}

/** Tick a practice item if it is not ticked yet (used when the app sees the step happen). */
export function markPracticeItem(dateKey: string, lessonId: string, itemId: string) {
  updateProgress((s) => {
    const day = s.practice[dateKey] ?? {};
    const items = day[lessonId] ?? [];
    if (items.includes(itemId)) return s;
    return { ...s, practice: { ...s.practice, [dateKey]: { ...day, [lessonId]: [...items, itemId] } } };
  });
}

export function togglePlanTask(weekKey: string, standardId: string, taskId: string) {
  updateProgress((s) => {
    const week = s.plan[weekKey] ?? {};
    const tasks = week[standardId] ?? [];
    const next = tasks.includes(taskId) ? tasks.filter((x) => x !== taskId) : [...tasks, taskId];
    return { ...s, plan: { ...s.plan, [weekKey]: { ...week, [standardId]: next } } };
  });
}

export function setNote(lessonId: string, text: string) {
  updateProgress((s) => {
    const notes = { ...s.notes };
    if (text.trim()) notes[lessonId] = { text, updatedAt: nowIso() };
    else delete notes[lessonId];
    return { ...s, notes };
  });
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  updateProgress((s) => (s.prefs[key] === value ? s : { ...s, prefs: { ...s.prefs, [key]: value } }));
}
