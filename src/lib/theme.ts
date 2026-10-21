'use client';

import { useSyncExternalStore } from 'react';
import { useProgress } from './progress/store';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** The theme actually in use: the saved preference, or the system setting. */
export function useResolvedTheme(): 'light' | 'dark' {
  const pref = useProgress((s) => s.prefs.theme);
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  if (pref === 'light' || pref === 'dark') return pref;
  return systemDark ? 'dark' : 'light';
}

/** Read a colour token from the stylesheet (after the theme attribute is applied). */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
