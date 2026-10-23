// The lick's analysis: chord tones, extensions, approach notes, rhythmic placement and resolution.
// Every note it names comes from the line on screen, so it stays right after transposition.

import type { AnalysisTopic, Lick, NoteRef } from '@/lib/music/types';
import { Frac, eventLength, onsetToBeat } from '@/lib/music/rhythm.mjs';
import { degreeLabel } from '@/lib/music/alphatex.mjs';
import { prettyChord, prettyPitch } from '@/lib/music/pretty';
import { ROLE_CLASS } from '@/lib/music/roles';
import { Prose, type ProseContext } from './Prose';
import { RoleLegend } from './RoleLegend';
import { beatText } from './NotesAsText';
import styles from './lesson.module.css';

const TOPICS: { topic: AnalysisTopic; title: string }[] = [
  { topic: 'chord-tones', title: 'Chord tones' },
  { topic: 'tensions', title: 'Extensions and tensions' },
  { topic: 'approach', title: 'Approach notes' },
  { topic: 'rhythm', title: 'Rhythmic placement' },
  { topic: 'resolution', title: 'Resolution' },
];

function onsetBeat(lick: Lick, [b, i]: NoteRef): number {
  let onset = new Frac(0);
  for (const ev of lick.bars[b - 1].events.slice(0, i - 1)) onset = onset.add(eventLength(ev));
  return onsetToBeat(onset, lick.timeSignature);
}

function chordAt(lick: Lick, bar: number, beat: number): string | null {
  let current: string | null = null;
  for (const c of lick.chords) if (c.bar < bar || (c.bar === bar && c.beat <= beat + 1e-9)) current = c.symbol;
  return current;
}

function NoteChips({ lick, notes, resolution }: { lick: Lick; notes: NoteRef[]; resolution: NoteRef }) {
  return (
    <ul className={styles.noteChips} aria-label="Notes">
      {notes.map(([b, i]) => {
        const ev = lick.bars[b - 1]?.events[i - 1];
        if (!ev || ev.rest) return null;
        const isRes = resolution[0] === b && resolution[1] === i;
        const cls = isRes ? 'resolution' : ev.role ? ROLE_CLASS[ev.role] : 'scale';
        return (
          <li key={`${b}.${i}`} className={`${styles.noteChip} ${styles[`role_${cls}`]}`}>
            <span className={styles.noteChipPitch}>{prettyPitch(ev.pitch, { octave: false })}</span>
            {ev.degree ? <span className={styles.noteChipDegree}>{degreeLabel(ev.degree)}</span> : null}
            <span className={styles.noteChipWhere}>
              bar {b}, beat {beatText(onsetBeat(lick, [b, i]))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function LickAnalysis({ lick, ctx, id }: { lick: Lick; ctx: ProseContext; id: string }) {
  const { analysis } = lick;
  const [rb, ri] = analysis.resolution.note;
  const resEv = lick.bars[rb - 1]?.events[ri - 1];
  const resBeat = onsetBeat(lick, analysis.resolution.note);
  const resChord = chordAt(lick, rb, resBeat);

  return (
    <section className={styles.analysis} id={id} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.analysisTitle}>
        Analysis
      </h3>
      <Prose text={analysis.summary} ctx={ctx} className={styles.lead} />
      <RoleLegend />
      <div className={styles.topics}>
        {TOPICS.map(({ topic, title }) => {
          const points = analysis.points.filter((p) => p.topic === topic);
          if (points.length === 0 && topic !== 'resolution') return null;
          return (
            <div key={topic} className={styles.topic}>
              <h4>{title}</h4>
              {topic === 'resolution' && resEv && !resEv.rest ? (
                <p className={styles.resolutionLine}>
                  The line lands on <span className={styles.tokNote}>{prettyPitch(resEv.pitch, { octave: false })}</span>, the{' '}
                  {degreeLabel(analysis.resolution.degree)} of {resChord ? <span className={styles.tokChord}>{prettyChord(resChord)}</span> : 'the chord'}, on beat{' '}
                  {beatText(resBeat)} of bar {rb}.
                </p>
              ) : null}
              <ul className={styles.points}>
                {points.map((p, i) => (
                  <li key={i}>
                    <Prose text={p.text} ctx={ctx} />
                    {p.notes.length ? <NoteChips lick={lick} notes={p.notes} resolution={analysis.resolution.note} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
