import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './blocks.module.css';

/** The end of a page: a field of blue that leads on to the next place, with its name set large. */
export function NextLink({ href, label, title, meta, testId }: { href: string; label: string; title: string; meta?: ReactNode; testId?: string }) {
  return (
    <Link href={href} className={styles.next} data-testid={testId}>
      <span className={styles.nextText}>
        <span className={styles.nextLabel}>{label}</span>
        <span className={styles.nextTitle}>{title}</span>
        {meta ? <span className={styles.nextMeta}>{meta}</span> : null}
      </span>
      <span className={styles.nextArrow} aria-hidden="true">
        <Icon name="arrowRight" size={34} />
      </span>
    </Link>
  );
}
