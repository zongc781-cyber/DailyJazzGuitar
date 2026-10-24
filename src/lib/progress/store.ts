'use client';

// A tiny external store over localStorage, read with useSyncExternalStore. The server snapshot is
// the empty state, so server HTML never depends on what one browser has saved.

import { useSyncExternalStore } from 'react';
import { STORAGE_KEY, emptyState, migrate, type ProgressState } from './state';

const SERVER_STATE = emptyState();
let state: ProgressState | null = null;
const listeners = new Set<() => void>();

function load(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState(); // private mode or blocked storage: work in memory
  }
}

function current(): ProgressState {
  state ??= load();
  return state;
}

// The theme attribute changes before any component hears about the new state, so effects that
// read colour tokens (the alphaTab score) already see the new theme's values.
function applyTheme(s: ProgressState) {
  const root = document.documentElement;
  if (s.prefs.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = s.prefs.theme;
}

function emit() {
  if (state) applyTheme(state);
  for (const l of listeners) l();
}

function onStorage(e: StorageEvent) {
  if (e.key !== STORAGE_KEY) return;
  state = load(); // another tab changed progress
  emit();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** Apply an immutable update and persist it. */
export function updateProgress(fn: (s: ProgressState) => ProgressState) {
  const next = fn(current());
  if (next === state) return;
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable: keep the in-memory state for this session.
  }
  emit();
}

export function replaceProgress(next: ProgressState) {
  updateProgress(() => next);
}

export function getProgress(): ProgressState {
  return current();
}

/** Subscribe to one slice of progress. Keep selectors cheap and return stable references. */
export function useProgress<T>(select: (s: ProgressState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(current()),
    () => select(SERVER_STATE),
  );
}

/** True after hydration; false during server render and the hydration pass. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function noopSubscribe() {
  return () => {};
}
