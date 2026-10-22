'use client';

// The standard's seven-day plan: listening, harmony, comping, arpeggios, vocabulary, improvisation
// and self-review. Today's day is featured at the top of the page; the whole week is a timeline
// with today circled in pencil. Ticks are drawn in blue pencil and kept per ISO week.

import Link from 'next/link';
import type { PlanDay, PlanFocus, Standard } from '@/lib/music/types';
import { togglePlanTask } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Pencil } from '@/components/ui/Pencil';
import ui from '@/components/ui/ui.module.css';
import lessonStyles from '@/components/lesson/lesson.module.css';
import { InlineProse, type ProseContext } from '@/components/lesson/Prose';
import { curly, typeset } from './text';
import styles from './standard.module.css';

export const FOCUS_LABEL: Record<PlanFocus, string> = {
  listening: 'Listening',
  harmony: 'Harmony',
  comping: 'Comping',
  arpeggios: 'Arpeggios',
  vocabulary: 'Vocabulary',
  improvisation: 'Improvisation',
  'self-review': 'Self-review',
};

/** What each kind of day is for, in one sentence. */
const FOCUS_AIM: Record<PlanFocus, string> = {
  listening: 'Get the sound of the tune in your ears before you play a note, with the chord chart in front of you.',
  harmony: 'Learn where the changes go: the roots, the roman numerals and the key centres.',
  comping: 'Play the changes as chords, in time, with the voicings from this page.',
  arpeggios: 'Spell out each chord one note at a time, in time, through the form.',
  vocabulary: 'Learn a line written over these changes, then place it in the tune.',
  improvisation: 'Solo over the form with the guide tones, the scales and this week’s licks.',
  'self-review': 'Record a chorus, listen back and decide what to work on next.',
};

const EMPTY: string[] = [];

export interface PlanLick {
  id: string;
  title: string;
  href: string;
}

/** Where a day's work happens: a section of this page, or the day's lick. */
export interface DayAction {
  href: string;
  label: string;
  icon: IconName;
}

function usePlanTicks(standardId: string, weekKey: string | null) {
  return useProgress((s) => (weekKey ? s.plan[weekKey]?.[standardId] : undefined) ?? EMPTY);
}

const doneCount = (day: PlanDay, ticks: string[]) => day.tasks.filter((_, k) => ticks.includes(`${day.day}.${k}`)).length;

/** A day's tasks as a checklist, ticked in blue pencil. */
function TaskList({ standardId, day, weekKey, ctx }: { standardId: string; day: PlanDay; weekKey: string | null; ctx: ProseContext }) {
  const ticks = usePlanTicks(standardId, weekKey);
  return (
    <ul className={styles.tasks}>
      {day.tasks.map((task, k) => {
        const id = `${day.day}.${k}`;
        const checked = ticks.includes(id);
        return (
          <li key={id}>
            <label className={lessonStyles.checkItem}>
              <input type="checkbox" checked={checked} disabled={!weekKey} onChange={() => weekKey && togglePlanTask(weekKey, standardId, id)} />
              <span className={lessonStyles.checkBox} aria-hidden="true">
                {checked ? <Pencil kind="tick" draw className={lessonStyles.tick} /> : null}
              </span>
              <span className={lessonStyles.checkText}>
                <span>
                  <InlineProse text={typeset(task)} ctx={ctx} />
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function DayLick({ lick }: { lick: PlanLick }) {
  // The arrow is kept on the same line as the title's last word, however the title wraps.
  const title = curly(lick.title);
  const cut = title.lastIndexOf(' ') + 1;
  return (
    <Link href={lick.href} className={styles.dayLick}>
      <Icon name="note" size={18} />
      <span>
        Lick for this day:{' '}
        <span className={styles.dayLickTitle}>
          {title.slice(0, cut)}
          <span className={styles.dayLickEnd}>
            {title.slice(cut)}
            <Icon name="chevronRight" size={16} className={styles.dayLickGo} />
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Today's day of the plan, featured at the top of the week with the one primary action. When every
 *  task is ticked, the count says so and names tomorrow's focus. */
export function TodayPractice({
  standardId,
  day,
  weekKey,
  ctx,
  lick,
  action,
  next,
}: {
  standardId: string;
  day: PlanDay;
  weekKey: string | null;
  ctx: ProseContext;
  lick?: PlanLick;
  action: DayAction;
  next?: PlanDay;
}) {
  const ticks = usePlanTicks(standardId, weekKey);
  const done = doneCount(day, ticks);
  const finished = done === day.tasks.length;
  const inPage = action.href.startsWith('#');
  const actionClass = `${ui.button} ${ui.primary} ${styles.todayAction}`;
  return (
    <div className={styles.todayCard}>
      <div className={styles.todayLead}>
        <div className={styles.todayTitleRow}>
          <span className={styles.todayNumeral} aria-hidden="true">
            {day.day}
            <Pencil kind="circle" draw className={styles.todayCircle} />
          </span>
          <div className={styles.todayTitles}>
            <p className={styles.todayDay}>
              Day {day.day} of 7 · {day.minutes} minutes
            </p>
            <h3 className={styles.todayFocus}>{FOCUS_LABEL[day.focus]}</h3>
          </div>
        </div>
        <p className={styles.todayAim}>{FOCUS_AIM[day.focus]}</p>
        <div className={styles.todayActions}>
          {inPage ? (
            <a href={action.href} className={actionClass}>
              {action.label}
              <Icon name={action.icon} size={18} />
            </a>
          ) : (
            <Link href={action.href} className={actionClass}>
              {action.label}
              <Icon name={action.icon} size={18} />
            </Link>
          )}
          <p className={`${styles.todayCount} ${finished ? styles.todayFinished : ''} num`} aria-live="polite">
            {finished ? (
              <>
                <Pencil kind="tick" draw className={styles.todayTick} />
                {done === 1 ? 'Done.' : `All ${done} done.`}
                {next ? ` Tomorrow: ${FOCUS_LABEL[next.focus]}.` : ' That’s the week.'}
              </>
            ) : (
              `${done} of ${day.tasks.length} done`
            )}
          </p>
        </div>
        {lick && lick.href !== action.href ? <DayLick lick={lick} /> : null}
      </div>
      <TaskList standardId={standardId} day={day} weekKey={weekKey} ctx={ctx} />
    </div>
  );
}

function PlanDayRow({ standardId, day, weekKey, today, ctx, lick }: { standardId: string; day: PlanDay; weekKey: string | null; today: boolean; ctx: ProseContext; lick?: PlanLick }) {
  const ticks = usePlanTicks(standardId, weekKey);
  const done = doneCount(day, ticks);
  const complete = done === day.tasks.length;
  return (
    <li className={`${styles.day} ${today ? styles.dayToday : ''} ${complete ? styles.dayDone : ''}`} aria-current={today ? 'step' : undefined}>
      <span className={styles.dayMarker} aria-hidden="true">
        {day.day}
        {today ? <Pencil kind="circle" draw className={styles.dayCircle} /> : null}
        {complete ? <Pencil kind="tick" className={styles.dayTick} /> : null}
      </span>
      <div className={styles.dayCard}>
        <div className={styles.dayHead}>
          <p className={styles.dayLabel}>
            <span>Day {day.day}</span>
            {today ? <span className={styles.todayTag}>Today</span> : null}
          </p>
          <h3 className={styles.dayFocus}>{FOCUS_LABEL[day.focus]}</h3>
          <p className={`${styles.dayMeta} num`}>
            {day.minutes} min · {complete ? 'all done' : `${done} of ${day.tasks.length} done`}
          </p>
        </div>
        <div className={styles.dayBody}>
          <TaskList standardId={standardId} day={day} weekKey={weekKey} ctx={ctx} />
          {lick ? <DayLick lick={lick} /> : null}
        </div>
      </div>
    </li>
  );
}

/** The seven days as a timeline. */
export function PracticePlan({
  standard,
  weekKey,
  todayDay,
  ctx,
  licks,
}: {
  standard: Standard;
  weekKey: string | null;
  todayDay: number | null;
  ctx: ProseContext;
  licks: Map<string, PlanLick>;
}) {
  return (
    <ol className={styles.timeline}>
      {standard.practicePlan.map((day) => (
        <PlanDayRow
          key={day.day}
          standardId={standard.id}
          day={day}
          weekKey={weekKey}
          today={todayDay === day.day}
          ctx={ctx}
          lick={day.lickId ? licks.get(day.lickId) : undefined}
        />
      ))}
    </ol>
  );
}
