'use client';

// Today's local date, which changes at local midnight while the app is open and is re-read when
// the tab becomes visible again (after sleep or travel). Null during the server render: the
// server cannot know the learner's day.

import { useSyncExternalStore } from 'react';
import { localDateKey, msUntilNextLocalDay } from '@/lib/schedule';

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  for (const l of listeners) l();
}

function arm() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    notify();
    arm();
  }, msUntilNextLocalDay(new Date()));
}

function onVisibility() {
  if (document.visibilityState !== 'visible') return;
  notify();
  arm();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    arm();
    document.addEventListener('visibilitychange', onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    if (timer) clearTimeout(timer);
    timer = null;
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

const getSnapshot = () => localDateKey(new Date());
const getServerSnapshot = () => null;

export function useLocalDate(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
