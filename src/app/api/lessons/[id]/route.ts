import { getLesson } from '@/server/library';

// GET /api/lessons/<id>: one published lesson (seed or generated) as JSON.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = /^[a-z0-9][a-z0-9-]*$/.test(id) ? await getLesson(id) : null;
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });
  return Response.json({ lesson }, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400' } });
}
