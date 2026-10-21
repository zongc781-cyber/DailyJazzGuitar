'use client';

// The standard's seven-day plan: listening, harmony, comping, arpeggios, vocabulary, improvisation
// and self-review. Ticks are kept per ISO week.

import Link from 'next/link';
import type { PlanDay, PlanFocus, Standard } from '@/lib/music/types';
import { togglePlanTask } from '@/lib/progress/actions';
import { useProgress } from '@/lib/progress/store';
import { Icon } from '@/components/ui/Icon';
import ui from '@/components/ui/ui.module.css';
import lessonStyles from '@/components/lesson/lesson.module.css';
import { InlineProse, type ProseContext } from '@/components/lesson/Prose';
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

const EMPTY: string[] = [];

export interface PlanLick {
  id: string;
  title: string;
  href: string;
}

export function PlanDayCard({
  standardId,
  day,
  weekKey,
  today,
  ctx,
  lick,
  featured,
}: {
  standardId: string;
  day: PlanDay;
  weekKey: string | null;
  today: boolean;
  ctx: ProseContext;
  lick?: PlanLick;
  featured?: boolean;
}) {
  const ticks = useProgress((s) => (weekKey ? s.plan[weekKey]?.[standardId] : undefined) ?? EMPTY);
  const done = day.tasks.filter((_, k) => ticks.includes(`${day.day}.${k}`)).length;
  return (
    <div className={`${styles.planDay} ${today ? styles.planToday : ''} ${featured ? styles.planFeatured : ''}`} aria-current={today && !featured ? 'step' : undefined}>
      <div className={styles.planHeader}>
        <span className={styles.planNumber}>Day {day.day}</span>
        <span className={styles.planFocus}>{FOCUS_LABEL[day.focus]}</span>
        <span className={`${styles.planMinutes} num`}>{day.minutes} min</span>
        {today && !featured ? <span className={`${ui.badge} ${ui.badgeSeed}`}>Today</span> : null}
        <span className={`${styles.planDone} num`} aria-label={`${done} of ${day.tasks.length} tasks done`}>
          {done === day.tasks.length ? <Icon name="checkCircle" size={18} /> : `${done}/${day.tasks.length}`}
        </span>
      </div>
      <ul className={styles.planTasks}>
        {day.tasks.map((task, k) => {
          const id = `${day.day}.${k}`;
          const checked = ticks.includes(id);
          return (
            <li key={id}>
              <label className={lessonStyles.checkItem}>
                <input type="checkbox" checked={checked} disabled={!weekKey} onChange={() => weekKey && togglePlanTask(weekKey, standardId, id)} />
                <span className={lessonStyles.checkBox} aria-hidden="true">
                  {checked ? <Icon name="check" size={16} /> : null}
                </span>
                <span className={lessonStyles.checkText}>
                  <span>
                    <InlineProse text={task} ctx={ctx} />
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {lick ? (
        <Link href={lick.href} className={styles.planLick}>
          <Icon name="note" size={18} />
          Lick for this day: {lick.title}
          <Icon name="chevronRight" size={16} />
        </Link>
      ) : null}
    </div>
  );
}

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
    <ol className={styles.plan}>
      {standard.practicePlan.map((day) => (
        <li key={day.day}>
          <PlanDayCard standardId={standard.id} day={day} weekKey={weekKey} today={todayDay === day.day} ctx={ctx} lick={day.lickId ? licks.get(day.lickId) : undefined} />
        </li>
      ))}
    </ol>
  );
}
