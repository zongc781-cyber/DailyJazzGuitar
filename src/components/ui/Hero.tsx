import { Fragment, useId, type CSSProperties, type ReactNode } from 'react';
import styles from './blocks.module.css';

/** A title whose words rise into place one after another. It stays one line of text for readers. */
export function RisingWords({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className={styles.word}>
            <span style={{ '--i': i } as CSSProperties}>{word}</span>
          </span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * The first screen of a page: a label row, one very large title, a line or two under it and one
 * action. On blue it fills the window and the top bar turns blue with it.
 */
export function Hero({
  tone = 'blue',
  top,
  title,
  children,
  actions,
}: {
  tone?: 'blue' | 'plain';
  top?: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const id = useId();
  return (
    <section className={`${styles.hero} ${tone === 'blue' ? styles.blue : styles.plain}`} data-hero={tone} aria-labelledby={id}>
      <div className={styles.heroTop}>{top}</div>
      <div className={styles.heroMain}>
        <h1 id={id} className={`${styles.heroTitle} ${title.length > 64 ? styles.long : ''}`}>
          <RisingWords text={title} />
        </h1>
        {children ? <div className={styles.heroBody}>{children}</div> : null}
        {actions ? <div className={styles.heroActions}>{actions}</div> : null}
      </div>
    </section>
  );
}

/** A section's index and title, set large: "01  Play it". */
export function SectionHead({ index, id, children }: { index?: string; id?: string; children: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.sectionIndex} aria-hidden="true">
        {index}
      </span>
      <h2 id={id} className={styles.sectionTitle}>
        {children}
      </h2>
    </div>
  );
}
