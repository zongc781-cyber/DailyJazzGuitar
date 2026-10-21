import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createGenerator, generateNextLick, generationStatus } from '@/server/generation';

// POST (or GET, which is what most cron services send) /api/cron/generate writes, validates and
// publishes one new daily lick. Call it on a schedule with `Authorization: Bearer $CRON_SECRET`.

export const dynamic = 'force-dynamic';
// Writing a lesson, and possibly one revision, takes minutes. Raise this if your host allows.
export const maxDuration = 300;

export const GET = run;
export const POST = run;

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: 'CRON_SECRET is not set, so this endpoint is off.' }, { status: 503 });
  if (!authorized(request.headers.get('authorization'), secret)) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (!generationStatus().enabled) return Response.json({ ok: false, error: 'Lesson generation is not set up on this server.' }, { status: 503 });

  const result = await generateNextLick({ generator: createGenerator() });
  if (!result.ok) {
    console.error(`[generate] ${result.stage} failed:\n  ${result.errors.join('\n  ')}`);
    const status = result.stage === 'validate' ? 422 : result.stage === 'generate' ? 502 : 500;
    return Response.json({ ok: false, stage: result.stage, errors: result.errors, attempts: result.attempts }, { status });
  }
  // Today, the week and the library all list lessons, so refresh every page.
  revalidatePath('/', 'layout');
  return Response.json({ ok: true, id: result.lesson.id, title: result.lesson.title, standardId: result.lesson.standardId, attempts: result.attempts });
}

function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
