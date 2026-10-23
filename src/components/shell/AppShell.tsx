'use client';

// App chrome: a quiet bar across the top with the name and the four places. On a page that opens
// on a blue field the bar turns blue with it, so the first screen reads as one colour. The layout
// keeps the bar mounted across navigations, so it never re-renders the page content.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './shell.module.css';

const NAV: { href: string; label: string; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Today', match: (p) => p === '/' },
  { href: '/week', label: 'This Week', match: (p) => p.startsWith('/week') },
  { href: '/library', label: 'Library', match: (p) => p.startsWith('/library') || p.startsWith('/lessons') },
  { href: '/progress', label: 'Progress', match: (p) => p.startsWith('/progress') },
];

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={styles.mark}>
      <path d="M16 2.5c7 0 12.5 3 12.5 7.8 0 6.4-7.4 15.6-12.5 19.2C10.9 25.9 3.5 16.7 3.5 10.3 3.5 5.5 9 2.5 16 2.5z" fill="currentColor" />
      <path d="M13.4 20.2V10.6l7.2-1.6v8.6" fill="none" stroke="var(--mark-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11.6" cy="20.3" r="2.1" fill="var(--mark-ink)" />
      <circle cx="18.8" cy="17.7" r="2.1" fill="var(--mark-ink)" />
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
          <span className={styles.brandName}>Daily Jazz Guitar</span>
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
