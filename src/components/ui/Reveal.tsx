'use client';

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import styles from './blocks.module.css';

const subscribeHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const readHash = () => window.location.hash;
const noHash = () => '';

const RevealOpen = createContext(true);

/** Whether the row this sits in is open (always true outside a row), so a heavy part can wait. */
export function useRevealOpen() {
  return use(RevealOpen);
}

/** Big titles stacked on hairlines, each opening its own details. */
export function RevealList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.revealList} ${className ?? ''}`}>{children}</div>;
}

/**
 * A very large title that opens its details below it. It starts closed unless `defaultOpen`, and
 * opens by itself when the address names it (#id) or a link to #id is followed, so a button
 * elsewhere on the page can lead straight into it.
 */
export function Reveal({
  id,
  index,
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  id: string;
  index?: string;
  title: ReactNode;
  /** A short fact at the right of the title, such as "2 of 7 done". */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const hash = useSyncExternalStore(subscribeHash, readHash, noHash);
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? (defaultOpen || hash === `#${id}`);
  const panelId = `${id}-panel`;

  // Following a link to this row opens it, even when the address already names it (no hashchange).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href]');
      if (link?.getAttribute('href') === `#${id}`) setChoice(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [id]);

  return (
    <section id={id} className={styles.reveal}>
      <h2 className={styles.revealHeading}>
        <button type="button" className={styles.revealButton} aria-expanded={open} aria-controls={panelId} onClick={() => setChoice(!open)}>
          <span className={styles.revealIndex} aria-hidden="true">
            {index}
          </span>
          <span className={styles.revealTitle}>{title}</span>
          <span className={styles.revealMeta}>{meta}</span>
          <span className={styles.revealIcon} aria-hidden="true" />
        </button>
      </h2>
      <div id={panelId} className={styles.revealPanel} hidden={!open}>
        <RevealOpen value={open}>{children}</RevealOpen>
      </div>
    </section>
  );
}
