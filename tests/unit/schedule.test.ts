import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoWeekKey, localDateKey, msUntilNextLocalDay, pickDay, pickWeek, planDay, weekDates } from '../../src/lib/schedule';
import type { CatalogEntry } from '../../src/lib/music/types';
import type { DailyAssignment, WeeklyAssignment } from '../../src/lib/progress/state';

const entry = (e: Partial<CatalogEntry> & Pick<CatalogEntry, 'id' | 'kind' | 'order'>): CatalogEntry => ({
  title: e.id,
  origin: 'seed',
  key: { tonic: 'C', mode: 'major' },
  simplified: false,
  tags: [],
  publishedAt: '2026-10-01',
  ...e,
});

const catalog: CatalogEntry[] = [
  entry({ id: 'std-a', kind: 'standard', order: 0, lickIds: ['a1', 'a2', 'a3'] }),
  entry({ id: 'a1', kind: 'lick', order: 1, standardId: 'std-a' }),
  entry({ id: 'a2', kind: 'lick', order: 2, standardId: 'std-a' }),
  entry({ id: 'a3', kind: 'lick', order: 3, standardId: 'std-a' }),
  entry({ id: 'std-b', kind: 'standard', order: 4, lickIds: ['b1'] }),
  entry({ id: 'b1', kind: 'lick', order: 5, standardId: 'std-b' }),
];

/** Runs the scheduler day by day, saving each assignment the way the app does. */
function simulate(days: string[], cat = catalog) {
  const weekly: Record<string, WeeklyAssignment> = {};
  const daily: Record<string, DailyAssignment> = {};
  const out: { date: string; standard: string | null; lick: string | null; review: boolean }[] = [];
  for (const date of days) {
    const week = pickWeek(cat, weekly, date);
    if (week.isNew && week.standardId) weekly[isoWeekKey(date)] = { standardId: week.standardId, assignedOn: date, assignedAt: `${date}T08:00:00Z`, review: week.review || undefined };
    const day = pickDay(cat, daily, date, week.standardId);
    if (day.isNew && day.lickId) daily[date] = { lickId: day.lickId, standardId: week.standardId, assignedAt: `${date}T08:00:00Z`, review: day.review || undefined };
    out.push({ date, standard: week.standardId, lick: day.lickId, review: day.review });
  }
  return { out, weekly, daily };
}

test('local date follows the time zone, not UTC', () => {
  const instant = new Date('2026-10-21T23:30:00Z');
  assert.equal(localDateKey(instant, 'UTC'), '2026-10-21');
  assert.equal(localDateKey(instant, 'America/Los_Angeles'), '2026-10-21');
  assert.equal(localDateKey(instant, 'Asia/Tokyo'), '2026-10-22');
});

test('ISO weeks run Monday to Sunday and the Thursday decides the year', () => {
  assert.equal(isoWeekKey('2026-10-21'), '2026-W43');
  assert.deepEqual(weekDates('2026-10-21'), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53');
  assert.equal(isoWeekKey('2027-01-04'), '2027-W01');
});

test('the next local day starts at local midnight, also across a clock change', () => {
  assert.equal(msUntilNextLocalDay(new Date('2026-10-21T22:00:00Z'), 'UTC'), 2 * 3_600_000);
  // New York leaves daylight saving time on 1 November 2026, so that day has 25 hours.
  assert.equal(msUntilNextLocalDay(new Date('2026-11-01T04:00:00Z'), 'America/New_York'), 25 * 3_600_000);
});

test('a week teaches one standard and each day a new lick from it', () => {
  const { out } = simulate(['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.deepEqual(
    out.map((d) => [d.standard, d.lick]),
    [
      ['std-a', 'a1'],
      ['std-a', 'a2'],
      ['std-a', 'a3'],
    ],
  );
});

test('the next week moves to the next standard', () => {
  const { out } = simulate(['2026-10-19', '2026-10-26']);
  assert.equal(out[1].standard, 'std-b');
  assert.equal(out[1].lick, 'b1');
});

test('a standard first given on a Friday continues the following week', () => {
  const { out } = simulate(['2026-10-23', '2026-10-26']);
  assert.equal(out[0].standard, 'std-a');
  assert.equal(out[1].standard, 'std-a');
  assert.equal(out[1].lick, 'a2');
});

test("a saved day keeps its lick when new lessons are published", () => {
  const { weekly, daily } = simulate(['2026-10-19']);
  const grown = [entry({ id: 'gen-a', kind: 'lick', order: 0, standardId: 'std-a', origin: 'generated' }), ...catalog];
  const week = pickWeek(grown, weekly, '2026-10-19');
  const day = pickDay(grown, daily, '2026-10-19', week.standardId);
  assert.equal(day.lickId, 'a1');
  assert.equal(day.isNew, false);
});

test('when every lick of the standard is used, an earlier one comes back as a review', () => {
  const { out } = simulate(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']);
  assert.deepEqual(
    out.map((d) => [d.lick, d.review]),
    [
      ['a1', false],
      ['a2', false],
      ['a3', false],
      ['a1', true],
    ],
  );
});

test('the plan day counts from when the standard started', () => {
  assert.equal(planDay('2026-10-21', '2026-10-21'), 1);
  assert.equal(planDay('2026-10-21', '2026-10-24'), 4);
  assert.equal(planDay('2026-10-23', '2026-10-30'), 7);
  assert.equal(planDay(null, '2026-10-21'), 3);
});
