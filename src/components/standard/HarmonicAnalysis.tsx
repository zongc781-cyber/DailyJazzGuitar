// How the changes work, section by section, and the common variations, each shown as the bars it
// changes, copied out like the chart above it.

import type { Standard } from '@/lib/music/types';
import { prettyChord, prettyRoman } from '@/lib/music/pretty';
import lessonStyles from '@/components/lesson/lesson.module.css';
import { Prose, lineContext, type ProseContext } from '@/components/lesson/Prose';
import { curly, typeset } from './text';
import styles from './standard.module.css';

type Variation = Standard['analysis']['variations'][number];

/** The bars a variation changes, as a short run of chart: bar number, chord and roman numeral. */
function VariationBars({ chords }: { chords: Variation['chords'] }) {
  const bars = [...new Set(chords.map((c) => c.bar))];
  return (
    <ol className={styles.miniChart} aria-label="Changed bars">
      {bars.map((bar, i) => {
        const inBar = chords.filter((c) => c.bar === bar);
        // Bars that are not next to each other are copied out apart, each closed by its own barline.
        const apart = i < bars.length - 1 && bars[i + 1] !== bar + 1;
        return (
          <li key={bar} className={`${styles.miniBar} ${apart ? styles.miniBreak : ''}`}>
            <span className={`${styles.miniNumber} num`}>
              <span className="visually-hidden">Bar </span>
              {bar}
              <span className="visually-hidden">: </span>
            </span>
            {inBar.map((c, i) => (
              <span key={i} className={styles.miniChord}>
                <span className={styles.miniSymbol}>{prettyChord(c.symbol)}</span>
                <span className={styles.miniRoman}>
                  <span className="visually-hidden"> (</span>
                  {prettyRoman(c.roman)}
                  <span className="visually-hidden">){i < inBar.length - 1 ? ', ' : ''}</span>
                </span>
              </span>
            ))}
          </li>
        );
      })}
    </ol>
  );
}

export function HarmonicAnalysis({ standard, ctx, id }: { standard: Standard; ctx: ProseContext; id: string }) {
  const { analysis, form } = standard;
  const rangeOf = (label: string) => {
    let start = 1;
    for (const s of form.sections) {
      if (s.label === label) return `bars ${start}–${start + s.bars - 1}`;
      start += s.bars;
    }
    return null;
  };

  return (
    <div className={styles.analysis} id={id}>
      <div className={styles.analysisColumn}>
        <h3 className={styles.analysisTitle}>How the changes work</h3>
        <Prose text={typeset(analysis.summary)} ctx={ctx} className={lessonStyles.lead} />
        {analysis.sections?.map((s, i) => {
          const range = rangeOf(s.label);
          return (
            <div key={i} className={styles.analysisPart}>
              <h4 className={styles.analysisPartHead}>
                <span className={styles.formMark}>
                  <span className="visually-hidden">Section </span>
                  {s.label}
                </span>
                {range ? (
                  <span className={styles.analysisRange}>
                    <span className="visually-hidden">, </span>
                    {range}
                  </span>
                ) : null}
              </h4>
              <Prose text={typeset(s.text)} ctx={ctx} />
            </div>
          );
        })}
      </div>
      <div className={styles.analysisColumn}>
        <h3 className={styles.analysisTitle}>Common variations</h3>
        <ol className={styles.variations}>
          {analysis.variations.map((v, i) => (
            <li key={i} className={styles.variation}>
              <h4>{curly(v.name)}</h4>
              <VariationBars chords={v.chords} />
              <Prose text={typeset(v.text)} ctx={lineContext([], v.chords, standard.key)} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
