import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileLessonStore } from '../../src/server/store';
import type { Lick } from '../../src/lib/music/types';

const seedLick = JSON.parse(await readFile('content/licks/al-06-grant-green-riff.json', 'utf8')) as Lick;
const generated = (id: string, generatedAt: string): Lick => {
  const lesson = structuredClone(seedLick);
  delete lesson.review;
  return { ...lesson, id, origin: 'generated', generator: { service: 'test', version: '1', generatedAt } };
};

test('saved lessons are listed oldest first, and an id is never overwritten', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'djg-store-'));
  try {
    const store = new FileLessonStore(dir);
    await store.ensureWritable();
    await store.save(generated('gen-b', '2026-10-22T08:00:00.000Z'));
    await store.save(generated('gen-a', '2026-10-21T08:00:00.000Z'));
    assert.deepEqual((await store.list()).map((p) => p.lesson.id), ['gen-a', 'gen-b']);
    await assert.rejects(store.save(generated('gen-a', '2026-10-23T08:00:00.000Z')), /already saved/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('damaged, invalid or seed files in the generated folder are never listed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'djg-store-'));
  try {
    await writeFile(join(dir, 'broken.json'), '{ not json');
    await writeFile(join(dir, 'seed.json'), JSON.stringify(seedLick));
    const invalid = generated('gen-bad', '2026-10-21T08:00:00.000Z');
    (invalid.bars[0].events[0] as { fret: number }).fret = 25;
    await writeFile(join(dir, 'gen-bad.json'), JSON.stringify(invalid));
    await writeFile(join(dir, 'gen-ok.json'), JSON.stringify(generated('gen-ok', '2026-10-21T08:00:00.000Z')));
    const store = new FileLessonStore(dir);
    assert.deepEqual((await store.list()).map((p) => p.lesson.id), ['gen-ok']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
