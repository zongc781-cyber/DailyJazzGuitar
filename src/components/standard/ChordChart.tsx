// The tune's chord chart by form section. With the analysis on, each bar shows its roman numeral
// and is tinted by key centre.

import type { Standard } from '@/lib/music/types';
import { prettyChord, prettyKey, prettyRoman } from '@/lib/music/pretty';
import styles from './standard.module.css';

const TINTS = ['kc0', 'kc1', 'kc2', 'kc3', 'kc4', 'kc5'] as const;

export function ChordChart({ standard, showAnalysis }: { standard: Standard; showAnalysis: boolean }) {
  const centres: string[] = [];
  const centreOf = (bar: number) => standard.keyCenters.find((c) => bar >= c.bars[0] && bar <= c.bars[1]);
  const tintOf = (bar: number) => {
    const c = centreOf(bar);
    if (!c) return '';
    const id = `${c.tonic} ${c.mode}`;
    if (!centres.includes(id)) centres.push(id);
    return styles[TINTS[centres.indexOf(id) % TINTS.length]];
  };
  const sections = standard.form.sections.map((s, i, all) => ({ label: s.label, bars: s.bars, start: 1 + all.slice(0, i).reduce((n, x) => n + x.bars, 0) }));
  const legend = [...new Map(standard.keyCenters.map((c) => [`${c.tonic} ${c.mode}`, c])).values()];

  return (
    <div className={styles.chart} data-testid="chord-chart">
      {sections.map((sec, si) => (
        <div key={si} className={styles.chartSection}>
          <p className={styles.sectionLabel}>
            <span className={styles.sectionLetter}>{sec.label}</span>
            <span className="num">
              bars {sec.start}–{sec.start + sec.bars - 1}
            </span>
          </p>
          <ol className={styles.bars} start={sec.start}>
            {Array.from({ length: sec.bars }, (_, i) => sec.start + i).map((bar) => {
              const chords = standard.chart[bar - 1]?.chords ?? [];
              return (
                <li key={bar} className={`${styles.bar} ${showAnalysis ? `${styles.tinted} ${tintOf(bar)}` : ''}`}>
                  <span className={`${styles.barNumber} num`} aria-hidden="true">
                    {bar}
                  </span>
                  <span className="visually-hidden">Bar {bar}: </span>
                  <span className={styles.barChords}>
                    {chords.map((c, ci) => (
                      <span key={ci} className={styles.chartChord}>
                        <span className={styles.chartSymbol}>{prettyChord(c.symbol)}</span>
                        {showAnalysis ? <span className={styles.roman}>{prettyRoman(c.roman)}</span> : null}
                        {chords.length > 1 ? <span className="visually-hidden">{` on beat ${c.beat}`}</span> : null}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {showAnalysis ? (
        <ul className={styles.centreLegend} aria-label="Key centres">
          {legend.map((c) => {
            const bars = standard.keyCenters.filter((k) => k.tonic === c.tonic && k.mode === c.mode);
            return (
              <li key={`${c.tonic}${c.mode}`} className={tintOf(c.bars[0])}>
                <span className={styles.centreSwatch} aria-hidden="true" />
                {prettyKey(c)}
                <span className={styles.centreBars}>
                  {' · bars '}
                  {bars.map((k) => (k.bars[0] === k.bars[1] ? `${k.bars[0]}` : `${k.bars[0]}–${k.bars[1]}`)).join(', ')}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
