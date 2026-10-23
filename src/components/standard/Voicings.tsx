'use client';

// Voicings, one chord at a time: choose a chord (the chosen one is blue and underlined) to see its
// shapes side by side, where it is played in the chart, and where each shape leads. The chords are
// radio buttons, so arrow keys move through them and the whole set is one stop for the Tab key.

import { useId, useMemo, useState } from 'react';
import type { Standard } from '@/lib/music/types';
import { prettyChord } from '@/lib/music/pretty';
import { ChordDiagram } from './ChordDiagram';
import { barRuns, curly, listJoin } from '@/lib/text';
import styles from './standard.module.css';

/** The voiced chords: those in the chart in order of first appearance, then the variations' chords. */
function voicedChords(standard: Standard) {
  const voiced = [...new Set(standard.voicings.map((v) => v.symbol))];
  const inChart: string[] = [];
  for (const bar of standard.chart) for (const c of bar.chords) if (voiced.includes(c.symbol) && !inChart.includes(c.symbol)) inChart.push(c.symbol);
  return { inChart, others: voiced.filter((s) => !inChart.includes(s)) };
}

function ChordChoice({ symbol, name, chosen, onChoose }: { symbol: string; name: string; chosen: boolean; onChoose: () => void }) {
  return (
    <label className={styles.choice}>
      <input type="radio" name={name} value={symbol} checked={chosen} onChange={onChoose} />
      <span className={styles.choiceFace}>{prettyChord(symbol)}</span>
    </label>
  );
}

export function Voicings({ standard, showAnalysis, leftHanded }: { standard: Standard; showAnalysis: boolean; leftHanded: boolean }) {
  const name = useId();
  const { inChart, others } = useMemo(() => voicedChords(standard), [standard]);
  const [symbol, setSymbol] = useState(inChart[0] ?? others[0]);
  const shapes = standard.voicings.filter((v) => v.symbol === symbol);
  const bars = standard.chart.flatMap((bar, i) => (bar.chords.some((c) => c.symbol === symbol) ? [i + 1] : []));
  const variations = standard.analysis.variations.filter((v) => v.chords.some((c) => c.symbol === symbol)).map((v) => `“${curly(v.name)}”`);
  const where = bars.length
    ? `${bars.length === 1 ? 'Bar' : 'Bars'} ${barRuns(bars)} of the chart`
    : variations.length
      ? `Not in the chart: it comes from the variation${variations.length > 1 ? 's' : ''} ${listJoin(variations)}`
      : null;

  return (
    <div className={styles.voicings}>
      <div className={styles.picker}>
        <fieldset className={styles.choiceGroup}>
          <legend className={styles.choiceLegend}>In the chart</legend>
          <div className={styles.choices}>
            {inChart.map((s) => (
              <ChordChoice key={s} symbol={s} name={name} chosen={s === symbol} onChoose={() => setSymbol(s)} />
            ))}
          </div>
        </fieldset>
        {others.length ? (
          <fieldset className={styles.choiceGroup}>
            <legend className={styles.choiceLegend}>For the variations</legend>
            <div className={styles.choices}>
              {others.map((s) => (
                <ChordChoice key={s} symbol={s} name={name} chosen={s === symbol} onChoose={() => setSymbol(s)} />
              ))}
            </div>
          </fieldset>
        ) : null}
      </div>

      <div className={styles.stage}>
        <div className={styles.stageHead} aria-live="polite">
          <p className={styles.stageSymbol}>{prettyChord(symbol)}</p>
          <p className={styles.stageMeta}>
            {shapes.length} {shapes.length === 1 ? 'shape' : 'shapes'}
            {where ? ` · ${where}` : ''}
          </p>
        </div>
        <ul className={styles.shapes}>
          {shapes.map((v, i) => (
            <li key={`${v.symbol}-${i}`}>
              <ChordDiagram voicing={v} showAnalysis={showAnalysis} leftHanded={leftHanded} />
            </li>
          ))}
        </ul>
        <p className={styles.stageKey}>
          {showAnalysis
            ? 'Dots show the chord degree of each note; the root is coloured.'
            : 'Numbers are fingers (1 index to 4 little, T thumb), × is a string you don’t play and o an open string. A number at the left is the fret the box starts on.'}
        </p>
      </div>
    </div>
  );
}
