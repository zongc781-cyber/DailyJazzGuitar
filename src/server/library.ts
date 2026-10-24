// The published library: the seed lessons bundled at build time (validated by
// scripts/build-library.mjs) followed by generated lessons from the lesson store.

import seedBundle from '../generated/seed-library.json';
import type { CatalogEntry, Lesson, PublishedLesson } from '../lib/music/types';
import { getLessonStore } from './store';

const SEED: Lesson[] = (seedBundle as unknown as { lessons: Lesson[] }).lessons;
const SEED_IDS = new Set(SEED.map((l) => l.id));

export function seedLessons(): Lesson[] {
  return SEED;
}

/** Seed lessons in curriculum order, then generated lessons in publication order. */
export async function publishedLessons(): Promise<PublishedLesson[]> {
  const seed = SEED.map((lesson) => ({ lesson, publishedAt: lesson.review?.reviewedOn ?? '1970-01-01' }));
  const generated = (await getLessonStore().list()).filter((p) => !SEED_IDS.has(p.lesson.id));
  return [...seed, ...generated];
}

export function toCatalogEntry({ lesson, publishedAt }: PublishedLesson, order: number): CatalogEntry {
  return {
    id: lesson.id,
    kind: lesson.kind,
    title: lesson.title,
    origin: lesson.origin,
    standardId: lesson.kind === 'lick' ? lesson.standardId : undefined,
    lickIds: lesson.kind === 'standard' ? lesson.lickIds ?? [] : undefined,
    key: lesson.key,
    difficulty: lesson.kind === 'lick' ? lesson.difficulty : undefined,
    artist: lesson.kind === 'lick' ? lesson.inspiration.artist : undefined,
    inspirationType: lesson.kind === 'lick' ? lesson.inspiration.type : undefined,
    composers: lesson.kind === 'standard' ? lesson.composers : undefined,
    simplified: lesson.simplified,
    tags: lesson.tags ?? [],
    publishedAt,
    order,
  };
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  return (await publishedLessons()).map(toCatalogEntry);
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const seed = SEED.find((l) => l.id === id);
  if (seed) return seed;
  return (await getLessonStore().list()).find((p) => p.lesson.id === id)?.lesson ?? null;
}
