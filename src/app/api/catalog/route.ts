import { getCatalog } from '@/server/library';
import { generationStatus } from '@/server/generation/config';

// GET /api/catalog: every published lesson (light entries) and whether generation is set up.
export async function GET() {
  const entries = await getCatalog();
  return Response.json({ entries, generation: generationStatus() }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } });
}
