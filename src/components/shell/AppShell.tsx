'use client';

// App chrome: a side rail, which shrinks to icons with small labels in a narrow window. The
// layout keeps it mounted across navigations, so it never re-renders the page content.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Pencil } from '@/components/ui/Pencil';
import styles from './shell.module.css';

const NAV: { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { href: '/', label: 'Today', icon: 'today', match: (p) => p === '/' },
  { href: '/week', label: 'This Week', icon: 'week', match: (p) => p.startsWith('/week') },
  { href: '/library', label: 'Library', icon: 'library', match: (p) => p.startsWith('/library') || p.startsWith('/lessons') },
  { href: '/progress', label: 'Progress', icon: 'progress', match: (p) => p.startsWith('/progress') },
];

function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={styles.mark}>
      <path d="M16 2.5c7 0 12.5 3 12.5 7.8 0 6.4-7.4 15.6-12.5 19.2C10.9 25.9 3.5 16.7 3.5 10.3 3.5 5.5 9 2.5 16 2.5z" fill="currentColor" />
      <path d="M13.4 20.2V10.6l7.2-1.6v8.6" fill="none" stroke="var(--paper)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11.6" cy="20.3" r="2.1" fill="var(--paper)" />
      <circle cx="18.8" cy="17.7" r="2.1" fill="var(--paper)" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main">
        <Link href="/" className={styles.brand} aria-label="Daily Jazz Guitar">
          <BrandMark />
          <span className={styles.brandText}>
            <span className={styles.brandName}>Daily Jazz Guitar</span>
            <span className={styles.brandTag}>A standard a week, a lick a day</span>
          </span>
        </Link>
        <ul className={styles.links}>
          {NAV.map((item) => {
            const current = item.match(pathname);
            return (
              <li key={item.href}>
                <Link href={item.href} className={styles.link} aria-current={current ? 'page' : undefined}>
                  <Icon name={item.icon} size={22} />
                  <span className={styles.label}>
                    {item.label}
                    {current ? <Pencil kind="underline" className={styles.current} /> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className={styles.footnote}>Your progress is saved in this browser only.</p>
      </nav>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
