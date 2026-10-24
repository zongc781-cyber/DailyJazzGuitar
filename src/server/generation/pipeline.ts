// Generate → validate → (one revision) → save. A lesson reaches the store only after it passes the
// same publish gate as the seed library, checked against everything already published.

import { parseChord, parsePitchClass, validateForPublish } from '../../lib/music/index.mjs';
import type { ChordPlacement, GeneratorInfo, Lesson, Lick } from '../../lib/music/types';
import { publishedLessons } from '../library';
import { getLessonStore, type LessonStore } from '../store';
import { ReplyFormatError, type LessonGenerator } from './generator';
import { planNextLick, type LickPlan } from './plan';

export const MAX_ATTEMPTS = 2;

export interface GenerateOptions {
  generator: LessonGenerator;
  store?: LessonStore;
  /** Lessons already published. Defaults to the seed library plus the store. */
  library?: Lesson[];
  /** Write this brief instead of planning one. */
  plan?: LickPlan;
  /** Validate but do not save. */
  dryRun?: boolean;
  now?: () => Date;
}

export type GenerateResult =
  | { ok: true; lesson: Lick; plan: LickPlan; attempts: number; saved: boolean }
  | { ok: false; stage: 'plan' | 'store' | 'generate' | 'validate'; errors: string[]; plan?: LickPlan; attempts: number };

export async function generateNextLick(options: GenerateOptions): Promise<GenerateResult> {
  const store = options.store ?? getLessonStore();
  const library = options.library ?? (await publishedLessons()).map((p) => p.lesson);
  const plan = options.plan ?? planNextLick(library);
  if (!plan) return { ok: false, stage: 'plan', errors: ['The library has no standard with a chart to write a lick over.'], attempts: 0 };
  if (!options.dryRun) {
    // Check before spending a generation on a lesson that could not be saved.
    try {
      await store.ensureWritable();
    } catch (e) {
      return { ok: false, stage: 'store', errors: [(e as Error).message], plan, attempts: 0 };
    }
  }

  const session = options.generator.start(plan);
  let problems: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let draft;
    try {
      draft = attempt === 1 ? await session.draft() : await session.revise(problems);
    } catch (e) {
      if (e instanceof ReplyFormatError) {
        problems = [e.message];
        continue;
      }
      return { ok: false, stage: 'generate', errors: [(e as Error).message], plan, attempts: attempt };
    }
    const generatedAt = (options.now?.() ?? new Date()).toISOString();
    const lesson = prepareLesson(draft.json, plan, { service: options.generator.service, version: draft.version, generatedAt });
    problems = await publishGate(lesson, plan, library);
    if (problems.length) continue;
    if (!options.dryRun) {
      try {
        await store.save(lesson);
      } catch (e) {
        return { ok: false, stage: 'store', errors: [(e as Error).message], plan, attempts: attempt };
      }
    }
    return { ok: true, lesson, plan, attempts: attempt, saved: !options.dryRun };
  }
  return { ok: false, stage: 'validate', errors: problems, plan, attempts: MAX_ATTEMPTS };
}

/**
 * Turns a draft into a generated lesson: the pipeline, not the generator, decides the id, origin,
 * provenance, standard and sources. Everything else is the draft's and is validated as written.
 */
export function prepareLesson(json: unknown, plan: LickPlan, generator: GeneratorInfo): Lick {
  const draft = { ...asObject(json) };
  for (const field of ['schemaVersion', 'kind', 'id', 'origin', 'review', 'generator', 'standardId', 'sources']) delete draft[field];
  const { title, inspiration, ...rest } = draft;
  const said = asObject(inspiration);
  const listen = plan.guitarist.recordings[0];
  return defined({
    schemaVersion: 1,
    kind: 'lick',
    id: plan.id,
    title,
    origin: 'generated',
    generator,
    standardId: plan.standard.id,
    // Only the type, artist and note come from the generator. The recording to listen to is the
    // hand-checked one, never one the generator names.
    inspiration: defined({ type: said.type, artist: said.artist, recording: listen?.title, year: listen?.year, note: said.note }),
    sources: plan.guitarist.recordings,
    ...rest,
  }) as unknown as Lick;
}

const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const defined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function publishGate(lesson: Lick, plan: LickPlan, library: Lesson[]): Promise<string[]> {
  const problems = checkBrief(lesson, plan);
  const report = await validateForPublish(lesson, { library, alphaTab: true });
  for (const e of report.errors) problems.push(`${e.path || '(root)'}: ${e.message}`);
  return problems;
}

/** The draft must be the lick the plan asked for: same harmony, key, metre and guitarist. */
export function checkBrief(lesson: Lick, plan: LickPlan): string[] {
  const problems: string[] = [];
  const { standard, key, guitarist } = plan;
  if (lesson.inspiration?.type !== 'in-the-style-of') problems.push('inspiration.type: must be "in-the-style-of" (a generated lick is never a transcription)');
  if (lesson.inspiration?.artist !== guitarist.name) problems.push(`inspiration.artist: must be "${guitarist.name}"`);
  if (lesson.key?.tonic !== key.tonic || lesson.key?.mode !== key.mode) problems.push(`key: must be ${JSON.stringify(key)}`);
  const ts = lesson.timeSignature;
  if (!Array.isArray(ts) || ts[0] !== standard.timeSignature[0] || ts[1] !== standard.timeSignature[1]) problems.push(`timeSignature: must be ${JSON.stringify(standard.timeSignature)}`);
  if (lesson.feel !== standard.feel) problems.push(`feel: must be "${standard.feel}"`);
  if (!sameChords(lesson.chords, plan.chords)) problems.push(`chords: must be exactly ${JSON.stringify(plan.chords)}`);
  return problems;
}

function sameChords(a: ChordPlacement[] | undefined, b: ChordPlacement[]): boolean {
  if (!Array.isArray(a) || a.length !== b.length) return false;
  return a.every((c, i) => {
    const x = parseChord(c?.symbol);
    const y = parseChord(b[i].symbol);
    const bass = (p: typeof x) => (p?.bass ? parsePitchClass(p.bass)?.pc : null);
    return !!x && !!y && c.bar === b[i].bar && c.beat === b[i].beat && x.root === y.root && x.quality === y.quality && bass(x) === bass(y);
  });
}
