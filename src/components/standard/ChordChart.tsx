// The tune's chord chart, copied out like a lead sheet with no frame: the section marks in the
// margin, four bars to a line, chord symbols in Real Book handwriting above a staff with one slash
// per beat, barlines, a double bar at the end of each section and a final bar at the end of the
// form. With the analysis on, the roman numerals are written under the staff and each key centre
// is shaded and named where it starts.

import type { CSSProperties } from 'react';
import type { Standard } from '@/lib/music/types';
import { prettyChord, prettyKey, prettyRoman } from '@/lib/music/pretty';
import { barRuns } from '@/lib/text';
import styles from './standard.module.css';

// The analysis colours, never the accent blue, which marks what is chosen or done.
const TINTS = ['kc0', 'kc1', 'kc2', 'kc3'] as const;

type Centre = Standard['keyCenters'][number];

const centreId = (c: Centre) => `${c.tonic} ${c.mode}`;

/** The key centres in order of first appearance, each with its tint and the bars it covers. */
export function keyCentres(standard: Standard) {
  const order: string[] = [];
  for (const c of standard.keyCenters) if (!order.includes(centreId(c))) order.push(centreId(c));
  return order.map((id, i) => {
    const runs = standard.keyCenters.filter((c) => centreId(c) === id);
    const bars = runs.flatMap((c) => Array.from({ length: c.bars[1] - c.bars[0] + 1 }, (_, k) => c.bars[0] + k));
    return { id, key: runs[0], tint: styles[TINTS[i % TINTS.length]], bars };
  });
}

export function ChordChart({ standard, showAnalysis }: { standard: Standard; showAnalysis: boolean }) {
  const beats = standard.timeSignature[0];
  const centres = keyCentres(standard);
  const centreOf = (bar: number) => standard.keyCenters.find((c) => bar >= c.bars[0] && bar <= c.bars[1]);
  const tintOf = (bar: number) => {
    const c = centreOf(bar);
    return c ? (centres.find((x) => x.id === centreId(c))?.tint ?? '') : '';
  };
  const sections = standard.form.sections.map((s, i, all) => ({ label: s.label, bars: s.bars, start: 1 + all.slice(0, i).reduce((n, x) => n + x.bars, 0) }));
  const lastBar = standard.chart.length;

  return (
    <div className={styles.chartBlock}>
      <div className={`${styles.chart} ${showAnalysis ? styles.chartAnalysed : ''}`} data-testid="chord-chart">
        {sections.map((sec) => {
          const end = sec.start + sec.bars - 1;
          return (
            <div key={sec.start} className={styles.chartSection} role="group" aria-label={`Section ${sec.label}, bars ${sec.start} to ${end}`}>
              <span className={styles.formMark} aria-hidden="true">
                {sec.label}
              </span>
              <ol className={styles.bars} start={sec.start}>
                {Array.from({ length: sec.bars }, (_, i) => sec.start + i).map((bar) => {
                  const chords = standard.chart[bar - 1]?.chords ?? [];
                  const centre = centreOf(bar);
                  const startsCentre = showAnalysis && centre && centre.bars[0] === bar;
                  const kind = bar === lastBar ? styles.finalBar : bar === end ? styles.sectionEnd : '';
                  return (
                    <li key={bar} className={`${styles.bar} ${kind} ${showAnalysis ? `${styles.shaded} ${tintOf(bar)}` : ''}`}>
                      <span className="visually-hidden">{`Bar ${bar}: `}</span>
                      <span className={styles.barTop}>
                        <span className={`${styles.barNumber} num`} aria-hidden="true">
                          {bar}
                        </span>
                        {startsCentre ? (
                          <span className={styles.keyTag}>
                            <span className="visually-hidden">key centre </span>
                            {prettyKey(centre)}
                            <span className="visually-hidden">, </span>
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.barChords}>
                        {chords.map((c, ci) => (
                          <span key={ci} className={styles.chordAt} style={{ '--at': (c.beat - 1) / beats } as CSSProperties}>
                            {prettyChord(c.symbol)}
                            {showAnalysis ? <span className="visually-hidden">{` (${prettyRoman(c.roman)})`}</span> : null}
                            {chords.length > 1 ? <span className="visually-hidden">{` on beat ${c.beat}${ci < chords.length - 1 ? ',' : ''}`}</span> : null}
                          </span>
                        ))}
                      </span>
                      <span className={styles.staff} aria-hidden="true">
                        {Array.from({ length: beats }, (_, k) => (
                          <i key={k} />
                        ))}
                      </span>
                      {showAnalysis ? (
                        <span className={styles.romans} aria-hidden="true">
                          {chords.map((c, ci) => (
                            <span key={ci} className={styles.chordAt} style={{ '--at': (c.beat - 1) / beats } as CSSProperties}>
                              {prettyRoman(c.roman)}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
      {showAnalysis ? (
        <ul className={styles.centreLegend} aria-label="Key centres">
          {centres.map((c) => (
            <li key={c.id} className={c.tint}>
              <span className={styles.centreSwatch} aria-hidden="true" />
              <span className={styles.centreName}>{prettyKey(c.key)}</span>
              <span className={styles.centreBars}>bars {barRuns(c.bars)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
