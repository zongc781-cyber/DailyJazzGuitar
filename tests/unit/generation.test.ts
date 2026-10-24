import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import type { Lesson, Lick, Standard } from '../../src/lib/music/types';
import type { LessonStore } from '../../src/server/store';
import { ClaudeLessonGenerator } from '../../src/server/generation/claude';
import { GeneratorUnavailableError, ReplyFormatError, type Draft, type LessonGenerator } from '../../src/server/generation/generator';
import { checkBrief, generateNextLick, prepareLesson } from '../../src/server/generation/pipeline';
import { candidatePassages, planNextLick, type LickPlan } from '../../src/server/generation/plan';
import { parseLessonReply } from '../../src/server/generation/prompt';

const read = (dir: string): Lesson[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Lesson);
const SEED: Lesson[] = [...read('content/standards'), ...read('content/licks')];
const licks = SEED.filter((l): l is Lick => l.kind === 'lick');
const standardOf = (lick: Lick) => SEED.find((l): l is Standard => l.kind === 'standard' && l.id === lick.standardId)!;
const without = (...ids: string[]) => SEED.filter((l) => !ids.includes(l.id));

/** A brief that the given seed lick answers exactly, as if it had been planned. */
function planFor(lick: Lick, id = 'gen-test-1'): LickPlan {
  return {
    id,
    standard: standardOf(lick),
    bars: [1, lick.bars.length],
    section: null,
    key: lick.key,
    chords: lick.chords,
    guitarist: {
      name: lick.inspiration.artist!,
      vocabulary: 'test',
      feels: ['swing', 'straight'],
      recordings: [{ title: 'Test Recording', kind: 'recording', author: lick.inspiration.artist, year: 1960 }],
    },
    existing: [],
  };
}

/** Plays back canned drafts and records what the pipeline sent. */
function fakeGenerator(drafts: (unknown | Error)[]) {
  const calls: { kind: 'draft' | 'revise'; problems?: string[] }[] = [];
  let started = 0;
  const next = async (): Promise<Draft> => {
    const d = drafts.shift();
    if (d instanceof Error) throw d;
    return { json: structuredClone(d), version: 'fake 1' };
  };
  const generator: LessonGenerator = {
    service: 'Fake generator',
    start: () => {
      started++;
      return {
        draft: () => (calls.push({ kind: 'draft' }), next()),
        revise: (problems) => (calls.push({ kind: 'revise', problems }), next()),
      };
    },
  };
  return { generator, calls, started: () => started };
}

function memoryStore(writable = true) {
  const saved: Lesson[] = [];
  const store: LessonStore = {
    list: async () => saved.map((lesson) => ({ lesson, publishedAt: lesson.generator?.generatedAt ?? '' })),
    save: async (lesson) => void saved.push(lesson),
    ensureWritable: async () => {
      if (!writable) throw new Error('read-only');
    },
  };
  return { store, saved };
}

const [first, second] = licks;

test('the planner picks the standard with the fewest licks and a passage no lick covers', () => {
  const plan = planNextLick(SEED)!;
  assert.ok(plan);
  const count = (id: string) => licks.filter((l) => l.standardId === id).length;
  for (const s of SEED.filter((l) => l.kind === 'standard')) assert.ok(count(plan.standard.id) <= count(s.id));
  assert.deepEqual([plan.chords[0].bar, plan.chords[0].beat], [1, 1]);
  assert.ok(plan.bars[1] - plan.bars[0] >= 1 && plan.bars[1] - plan.bars[0] <= 3);
  assert.ok(plan.guitarist.feels.includes(plan.standard.feel));
  assert.match(plan.id, new RegExp(`^gen-${plan.standard.id}-[a-z-]+-\\d+$`));
  assert.ok(!SEED.some((l) => l.id === plan.id));
  const same = (l: Lick) => JSON.stringify(l.chords) === JSON.stringify(plan.chords) && l.key.tonic === plan.key.tonic;
  assert.ok(!licks.filter((l) => l.standardId === plan.standard.id).some(same), 'the passage is already covered by a lick in the same key');
});

test('every candidate passage stays inside one key centre and starts with a chord on beat 1', () => {
  for (const s of SEED.filter((l): l is Standard => l.kind === 'standard')) {
    const passages = candidatePassages(s);
    assert.ok(passages.length > 0);
    for (const p of passages) {
      assert.deepEqual([p.chords[0].bar, p.chords[0].beat], [1, 1]);
      assert.ok(s.keyCenters.some((k) => k.bars[0] <= p.bars[0] && p.bars[1] <= k.bars[1] && k.tonic === p.key.tonic));
    }
  }
});

test('the pipeline, not the generator, sets id, origin, provenance, standard and sources', () => {
  const plan = planFor(first);
  const draft = { ...structuredClone(first), id: 'something-else', origin: 'seed', inspiration: { ...first.inspiration, recording: 'Invented Album', at: '1:23' } };
  const lesson = prepareLesson(draft, plan, { service: 'Fake generator', version: 'fake 1', generatedAt: '2026-10-21T12:00:00.000Z' });
  assert.equal(lesson.id, 'gen-test-1');
  assert.equal(lesson.origin, 'generated');
  assert.equal(lesson.review, undefined);
  assert.deepEqual(lesson.generator, { service: 'Fake generator', version: 'fake 1', generatedAt: '2026-10-21T12:00:00.000Z' });
  assert.equal(lesson.standardId, plan.standard.id);
  assert.deepEqual(lesson.sources, plan.guitarist.recordings);
  assert.equal(lesson.inspiration.recording, 'Test Recording');
  assert.equal(lesson.inspiration.at, undefined);
  assert.equal(lesson.inspiration.note, first.inspiration.note);
});

test('the brief check rejects transcriptions and drafts in another key or over other chords', () => {
  const plan = planFor(first);
  const lesson = prepareLesson(structuredClone(first), plan, { service: 'x', version: '1', generatedAt: '2026-10-21' });
  assert.deepEqual(checkBrief(lesson, plan), []);
  const wrong = { ...lesson, inspiration: { ...lesson.inspiration, type: 'transcription' as const }, key: { tonic: 'F#', mode: lesson.key.mode }, chords: lesson.chords.slice(1) };
  const problems = checkBrief(wrong, plan).join('\n');
  assert.match(problems, /never a transcription/);
  assert.match(problems, /^key: must be/m);
  assert.match(problems, /^chords: must be exactly/m);
});

test('a passing draft is published on the first attempt', async () => {
  const { generator, calls } = fakeGenerator([first]);
  const { store, saved } = memoryStore();
  const result = await generateNextLick({ generator, store, library: without(first.id), plan: planFor(first) });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.attempts, 1);
  assert.deepEqual(calls.map((c) => c.kind), ['draft']);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, 'gen-test-1');
  assert.equal(saved[0].origin, 'generated');
});

test('a repeat of a published lick is sent back once with the problems, and the revision is published', async () => {
  // The first draft copies a lick that is still in the library; the revision is new.
  const { generator, calls } = fakeGenerator([first, second]);
  const { store, saved } = memoryStore();
  const result = await generateNextLick({ generator, store, library: without(second.id), plan: planFor(second) });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.attempts, 2);
  assert.deepEqual(calls.map((c) => c.kind), ['draft', 'revise']);
  assert.ok(calls[1].problems!.some((p) => p.includes('same intervals and rhythm')));
  assert.equal(saved.length, 1);
});

test('a lesson that fails twice is never saved', async () => {
  const { generator } = fakeGenerator([first, first]);
  const { store, saved } = memoryStore();
  const result = await generateNextLick({ generator, store, library: SEED, plan: planFor(first) });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, 'validate');
    assert.ok(result.errors.some((e) => e.includes('same intervals and rhythm')));
  }
  assert.equal(saved.length, 0);
});

test('an unreadable reply is sent back as a problem', async () => {
  const { generator, calls } = fakeGenerator([new ReplyFormatError('The reply was not valid JSON: Unexpected token'), first]);
  const { store } = memoryStore();
  const result = await generateNextLick({ generator, store, library: without(first.id), plan: planFor(first) });
  assert.equal(result.ok, true);
  assert.deepEqual(calls[1].problems, ['The reply was not valid JSON: Unexpected token']);
});

test('a generator that cannot answer stops the run without a retry', async () => {
  const { generator, calls } = fakeGenerator([new GeneratorUnavailableError('Could not reach the API.')]);
  const { store, saved } = memoryStore();
  const result = await generateNextLick({ generator, store, library: SEED, plan: planFor(first) });
  assert.deepEqual(result.ok ? null : [result.stage, result.errors], ['generate', ['Could not reach the API.']]);
  assert.equal(calls.length, 1);
  assert.equal(saved.length, 0);
});

test('nothing is generated when the store cannot save', async () => {
  const fake = fakeGenerator([first]);
  const { store } = memoryStore(false);
  const result = await generateNextLick({ generator: fake.generator, store, library: SEED, plan: planFor(first) });
  assert.equal(result.ok ? null : result.stage, 'store');
  assert.equal(fake.started(), 0);
});

test('a dry run validates without saving', async () => {
  const { generator } = fakeGenerator([first]);
  const { store, saved } = memoryStore(false);
  const result = await generateNextLick({ generator, store, library: without(first.id), plan: planFor(first), dryRun: true });
  assert.equal(result.ok && result.saved, false);
  assert.equal(result.ok, true);
  assert.equal(saved.length, 0);
});

test('replies are read from a json code block or a bare object', () => {
  assert.deepEqual(parseLessonReply('Here it is:\n```json\n{"title": "x"}\n```\n'), { title: 'x' });
  assert.deepEqual(parseLessonReply('{"title": "y"}'), { title: 'y' });
  assert.throws(() => parseLessonReply('```json\n{"title": \n```'), ReplyFormatError);
  assert.throws(() => parseLessonReply('no lesson here'), ReplyFormatError);
  assert.throws(() => parseLessonReply('```json\n[1, 2]\n```'), ReplyFormatError);
});

test('the Claude generator caches the instructions, thinks adaptively and continues the same conversation for a revision', async () => {
  const sent: Record<string, unknown>[] = [];
  const replies = [
    { model: 'test-model', stop_reason: 'end_turn', stop_details: null, content: [{ type: 'thinking', thinking: 'plan the line', signature: 'sig' }, { type: 'text', text: '```json\n{"title": "first"}\n```' }] },
    { model: 'test-model', stop_reason: 'end_turn', stop_details: null, content: [{ type: 'text', text: '```json\n{"title": "second"}\n```' }] },
    { model: 'test-model', stop_reason: 'refusal', stop_details: { category: null, explanation: 'Not this time.' }, content: [] },
  ];
  const firstReply = structuredClone(replies[0]);
  const client = {
    beta: {
      messages: {
        stream: (params: Record<string, unknown>) => {
          sent.push(structuredClone(params));
          return { finalMessage: async () => replies.shift() };
        },
      },
    },
  } as unknown as Anthropic;
  const plan = planFor(first);
  const generator = new ClaudeLessonGenerator({ apiKey: 'test-key', model: 'test-model', fallbacks: true }, client);
  const session = generator.start(plan);

  assert.deepEqual(await session.draft(), { json: { title: 'first' }, version: 'test-model, prompt 1' });
  const request = sent[0] as { model: string; thinking: unknown; output_config: unknown; fallbacks: unknown; betas: string[]; system: { cache_control: unknown; text: string }[]; messages: { role: string; content: unknown }[] };
  assert.equal(request.model, 'test-model');
  assert.deepEqual(request.thinking, { type: 'adaptive' });
  assert.deepEqual(request.output_config, { effort: 'high' });
  assert.equal(request.fallbacks, 'default');
  assert.ok(request.betas.includes('server-side-fallback-2026-07-01'));
  assert.deepEqual(request.system[0].cache_control, { type: 'ephemeral' });
  assert.match(request.system[0].text, /in-the-style-of/);
  assert.match(String(request.messages[0].content), new RegExp(plan.id));

  assert.deepEqual((await session.revise(['bars[0]: wrong pitch'])).json, { title: 'second' });
  const revision = sent[1] as { messages: { role: string; content: unknown }[] };
  assert.deepEqual(
    revision.messages.map((m) => m.role),
    ['user', 'assistant', 'user'],
  );
  // The first reply goes back unchanged, thinking block included.
  assert.deepEqual(revision.messages[1].content, firstReply.content);
  assert.match(String(revision.messages[2].content), /- bars\[0\]: wrong pitch/);

  await assert.rejects(session.revise(['again']), (e: Error) => e instanceof GeneratorUnavailableError && /declined.*Not this time/.test(e.message));
});
