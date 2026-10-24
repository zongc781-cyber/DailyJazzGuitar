'use client';

// App chrome: a quiet bar across the top with the name and the four places. On a page that opens
// on a blue field the bar turns blue with it, so the first screen reads as one colour. The layout
// keeps the bar mounted across navigations, so it never re-renders the page content.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import MARK from './mark.json';
import styles from './shell.module.css';

const NAV: { href: string; label: string; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Today', match: (p) => p === '/' },
  { href: '/week', label: 'This Week', match: (p) => p.startsWith('/week') },
  { href: '/library', label: 'Library', match: (p) => p.startsWith('/library') || p.startsWith('/lessons') },
  { href: '/progress', label: 'Progress', match: (p) => p.startsWith('/progress') },
];

/** The app icon in small: a tile with the "j" of the titles, its dot a note head. */
function BrandMark() {
  return (
    <svg width="30" height="30" viewBox={`0 0 ${MARK.size} ${MARK.size}`} aria-hidden="true" focusable="false" className={styles.mark}>
      <rect width={MARK.size} height={MARK.size} rx={MARK.radius} fill="currentColor" />
      <path d={MARK.j} fill="var(--mark-ink)" />
      <path d={MARK.head} fill="var(--mark-ink)" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <BrandMark />
          <span className={styles.brandName}>Journal</span>
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.links}>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.link} aria-current={item.match(pathname) ? 'page' : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>A standard a week, a lick a day.</p>
        <p>Your progress is saved in this browser only.</p>
      </footer>
    </div>
  );
}
