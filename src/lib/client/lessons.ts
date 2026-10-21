'use client';

// Lesson JSON from /api/lessons/<id>, one request per lesson per page load. Components read it
// with use(lessonPromise(id)) inside a Suspense boundary.

import type { Lesson } from '@/lib/music/types';

const cache = new Map<string, Promise<Lesson>>();

export function lessonPromise(id: string): Promise<Lesson> {
  let promise = cache.get(id);
  if (!promise) {
    promise = fetch(`/api/lessons/${encodeURIComponent(id)}`).then(async (res) => {
      if (res.status === 404) throw new Error('This lesson is no longer in the library.');
      if (!res.ok) throw new Error('The lesson could not be loaded. Check your connection and try again.');
      return ((await res.json()) as { lesson: Lesson }).lesson;
    });
    cache.set(id, promise);
    promise.catch(() => cache.delete(id)); // let a retry fetch again
  }
  return promise;
}
