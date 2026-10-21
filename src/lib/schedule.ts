// Lesson scheduling by the learner's local calendar.
//
// - A daily lick is fixed for a local day and a standard for a local ISO week (Monday to
//   Sunday). Each assignment is saved the first time it is made, so reloading, travelling or a
//   newly published lesson never swaps today's lesson.
// - Each week follows the next standard in curriculum order, and each day takes that standard's
//   next unused lick. A standard first assigned on a Friday, Saturday or Sunday continues the
//   following week, so a learner who starts late in a week still gets a full week with it.
// - A lick is not repeated until all of the week's standard's licks have been used, and a
//   standard not until every standard has been taught. Then lessons come back, least recently
//   seen first, marked as review.

import type { CatalogEntry } from './music/types';
import type { DailyAssignment, WeeklyAssignment } from './progress/state';

const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The local calendar date ("YYYY-MM-DD") of an instant in a time zone. */
export function localDateKey(now: Date, timeZone?: string): string {
  let fmt = formatters.get(timeZone ?? '');
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone ?? '', fmt);
  }
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function toUtc(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  return fromUtc(new Date(toUtc(dateKey).getTime() + days * DAY_MS));
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((toUtc(toKey).getTime() - toUtc(fromKey).getTime()) / DAY_MS);
}

/** 1 = Monday ... 7 = Sunday. */
export function isoWeekday(dateKey: string): number {
  return toUtc(dateKey).getUTCDay() || 7;
}

/** ISO 8601 week, e.g. "2026-W43". */
export function isoWeekKey(dateKey: string): string {
  const date = toUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + 4 - isoWeekday(dateKey)); // the Thursday decides the year
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday to Sunday of the week containing dateKey. */
export function weekDates(dateKey: string): string[] {
  const monday = addDays(dateKey, 1 - isoWeekday(dateKey));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Milliseconds until the next local midnight, so an open app can roll over to the new day. */
export function msUntilNextLocalDay(now: Date, timeZone?: string): number {
  const today = localDateKey(now, timeZone);
  // Step forward in 15-minute increments: correct across DST changes and odd offsets.
  let t = now.getTime();
  const coarse = 15 * 60_000;
  while (localDateKey(new Date(t + coarse), timeZone) === today) t += coarse;
  while (localDateKey(new Date(t + 1000), timeZone) === today) t += 1000;
  return Math.max(1000, t + 1000 - now.getTime());
}

const byOrder = (a: CatalogEntry, b: CatalogEntry) => a.order - b.order || a.id.localeCompare(b.id);

export interface WeekPick {
  standardId: string | null;
  review: boolean;
  /** True when this pick still has to be saved. */
  isNew: boolean;
  /** The local date this standard's run of weeks started, for the plan's day number. */
  startedOn: string | null;
}

/** First local date of the run of consecutive weeks that ends with weekKey's assignment. */
function runStart(weekly: Record<string, WeeklyAssignment>, standardId: string, dateKey: string): string | null {
  let start: string | null = null;
  let probe = dateKey;
  for (let i = 0; i < 8; i++) {
    const a = weekly[isoWeekKey(probe)];
    if (!a || a.standardId !== standardId) break;
    start = a.assignedOn ?? probe;
    probe = addDays(weekDates(probe)[0], -1); // Sunday of the previous week
  }
  return start;
}

/** Which standard a week teaches. */
export function pickWeek(catalog: CatalogEntry[], weekly: Record<string, WeeklyAssignment>, dateKey: string): WeekPick {
  const weekKey = isoWeekKey(dateKey);
  const ids = new Set(catalog.map((e) => e.id));
  const saved = weekly[weekKey];
  if (saved && ids.has(saved.standardId)) {
    return { standardId: saved.standardId, review: Boolean(saved.review), isNew: false, startedOn: runStart(weekly, saved.standardId, dateKey) };
  }
  const standards = catalog.filter((e) => e.kind === 'standard').sort(byOrder);
  if (standards.length === 0) return { standardId: null, review: false, isNew: false, startedOn: null };

  const weeksOf = new Map<string, WeeklyAssignment[]>();
  for (const [wk, a] of Object.entries(weekly)) {
    if (wk >= weekKey) continue; // only the past decides what is "used"
    weeksOf.set(a.standardId, [...(weeksOf.get(a.standardId) ?? []), a]);
  }
  // A standard is complete after a full week (first assigned Monday to Thursday) or two weeks.
  const complete = (id: string) => {
    const ws = weeksOf.get(id) ?? [];
    return ws.length >= 2 || ws.some((w) => !w.review && isoWeekday(w.assignedOn) <= 4) || ws.some((w) => w.review);
  };
  const previous = weekly[isoWeekKey(addDays(dateKey, -7))];
  // Continue a short first week before starting anything new.
  if (previous && !previous.review && ids.has(previous.standardId) && !complete(previous.standardId)) {
    return { standardId: previous.standardId, review: false, isNew: true, startedOn: runStart(weekly, previous.standardId, addDays(dateKey, -7)) };
  }
  const next = standards.find((s) => !weeksOf.has(s.id));
  if (next) return { standardId: next.id, review: false, isNew: true, startedOn: dateKey };
  const unfinished = standards.find((s) => !complete(s.id));
  if (unfinished) return { standardId: unfinished.id, review: false, isNew: true, startedOn: dateKey };
  // Everything has been taught: review the standard seen least recently.
  const lastSeen = (id: string) => (weeksOf.get(id) ?? []).reduce((m, w) => (w.assignedOn > m ? w.assignedOn : m), '');
  const oldest = [...standards].sort((a, b) => lastSeen(a.id).localeCompare(lastSeen(b.id)) || byOrder(a, b))[0];
  return { standardId: oldest.id, review: true, isNew: true, startedOn: dateKey };
}

export interface DayPick {
  lickId: string | null;
  review: boolean;
  isNew: boolean;
}

/** Which lick a day teaches, given that week's standard. */
export function pickDay(catalog: CatalogEntry[], daily: Record<string, DailyAssignment>, dateKey: string, standardId: string | null): DayPick {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const saved = daily[dateKey];
  if (saved && byId.get(saved.lickId)?.kind === 'lick') return { lickId: saved.lickId, review: Boolean(saved.review), isNew: false };

  const licks = catalog.filter((e) => e.kind === 'lick').sort(byOrder);
  if (licks.length === 0) return { lickId: null, review: false, isNew: false };
  const used = new Set(Object.entries(daily).filter(([d]) => d !== dateKey).map(([, a]) => a.lickId));
  const standard = standardId ? byId.get(standardId) : undefined;
  const ofStandard = [
    ...(standard?.lickIds ?? []).map((id) => byId.get(id)).filter((e): e is CatalogEntry => e?.kind === 'lick'),
    ...licks.filter((l) => l.standardId === standardId && !(standard?.lickIds ?? []).includes(l.id)),
  ];
  const fresh = ofStandard.find((l) => !used.has(l.id));
  if (fresh) return { lickId: fresh.id, review: false, isNew: true };

  const lastSeen = new Map<string, string>();
  for (const [d, a] of Object.entries(daily)) if (d < dateKey && (lastSeen.get(a.lickId) ?? '') < d) lastSeen.set(a.lickId, d);
  const leastRecent = (pool: CatalogEntry[]) => [...pool].sort((a, b) => (lastSeen.get(a.id) ?? '').localeCompare(lastSeen.get(b.id) ?? '') || byOrder(a, b))[0];
  if (ofStandard.length) return { lickId: leastRecent(ofStandard).id, review: true, isNew: true };
  // A standard without licks of its own: any unused lick, then the least recent one.
  const anyFresh = licks.find((l) => !used.has(l.id));
  if (anyFresh) return { lickId: anyFresh.id, review: false, isNew: true };
  return { lickId: leastRecent(licks).id, review: true, isNew: true };
}

/** Day of the seven-day plan (1-7) for a date, counted from when the standard's run started. */
export function planDay(startedOn: string | null, dateKey: string): number {
  if (!startedOn) return isoWeekday(dateKey);
  return Math.min(7, Math.max(1, daysBetween(startedOn, dateKey) + 1));
}
