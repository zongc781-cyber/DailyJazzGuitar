// Where generated lessons live once they have passed the publish gate.
//
// The store is an interface so it can be replaced: FileLessonStore writes one JSON file per lesson
// to content/generated (fine for a server with a disk, and for the CLI, whose output can be
// committed). On a read-only or serverless host, implement LessonStore with a database or object
// storage and return it from getLessonStore().

import { access, constants, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateLesson } from '../lib/music/lesson.mjs';
import type { Lesson, PublishedLesson } from '../lib/music/types';

export interface LessonStore {
  /** Every lesson this store has published, oldest first. */
  list(): Promise<PublishedLesson[]>;
  /** Save a lesson that has already passed validateForPublish. Never replaces a saved lesson. */
  save(lesson: Lesson): Promise<void>;
  /** Throws, saying why, when save() could not succeed (for example a read-only disk). */
  ensureWritable(): Promise<void>;
}

const CACHE_MS = 30_000;

export class FileLessonStore implements LessonStore {
  private cache: { at: number; lessons: PublishedLesson[] } | null = null;

  constructor(private readonly dir: string) {}

  async list(): Promise<PublishedLesson[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.lessons;
    let files: string[] = [];
    try {
      files = (await readdir(this.dir)).filter((f) => f.endsWith('.json')).sort();
    } catch {
      files = []; // no generated lessons yet
    }
    const lessons: PublishedLesson[] = [];
    for (const f of files) {
      try {
        const lesson = JSON.parse(await readFile(join(this.dir, f), 'utf8')) as Lesson;
        // The full gate ran before saving; re-check the structure so a hand-edited or damaged file
        // is never shown.
        const report = validateLesson(lesson, f);
        if (!report.ok || lesson.origin !== 'generated') {
          console.warn(`[lesson-store] skipping ${f}: ${report.errors.map((e) => e.message).join('; ') || 'not a generated lesson'}`);
          continue;
        }
        lessons.push({ lesson, publishedAt: lesson.generator?.generatedAt ?? '1970-01-01' });
      } catch (e) {
        console.warn(`[lesson-store] skipping ${f}: ${(e as Error).message}`);
      }
    }
    lessons.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.lesson.id.localeCompare(b.lesson.id));
    this.cache = { at: Date.now(), lessons };
    return lessons;
  }

  async save(lesson: Lesson): Promise<void> {
    await this.ensureWritable();
    try {
      // 'wx' fails if the file exists, so a published lesson is never overwritten.
      await writeFile(join(this.dir, `${lesson.id}.json`), JSON.stringify(lesson, null, 2) + '\n', { flag: 'wx' });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`A lesson with id "${lesson.id}" is already saved.`);
      throw e;
    }
    this.cache = null;
  }

  async ensureWritable(): Promise<void> {
    try {
      await mkdir(this.dir, { recursive: true });
      await access(this.dir, constants.W_OK);
    } catch {
      throw new Error(`Generated lessons cannot be saved to ${this.dir}. Set GENERATED_LESSONS_DIR to a writable folder, or replace FileLessonStore (src/server/store.ts) with a database store.`);
    }
  }
}

let store: LessonStore | null = null;

export function getLessonStore(): LessonStore {
  store ??= new FileLessonStore(process.env.GENERATED_LESSONS_DIR ?? join(process.cwd(), 'content', 'generated'));
  return store;
}

/** For tests: use another store implementation. */
export function setLessonStore(next: LessonStore | null) {
  store = next;
}
