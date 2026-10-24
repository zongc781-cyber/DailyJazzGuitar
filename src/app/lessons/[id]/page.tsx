import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog, getLesson, seedLessons } from '@/server/library';
import { LessonScreen } from '@/components/screens/LessonScreen';
import { licksFor } from '@/lib/catalog';

type Params = { params: Promise<{ id: string }> };

export const revalidate = 300;

export function generateStaticParams() {
  return seedLessons().map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lesson = await getLesson((await params).id);
  if (!lesson) return { title: 'Lesson not found' };
  return {
    title: lesson.title,
    description: lesson.kind === 'lick' ? `A daily jazz guitar lick${lesson.inspiration.artist ? ` in the style of ${lesson.inspiration.artist}` : ''}.` : `${lesson.title}: a weekly jazz standard study.`,
  };
}

export default async function LessonPage({ params }: Params) {
  const { id } = await params;
  const [lesson, catalog] = await Promise.all([getLesson(id), getCatalog()]);
  if (!lesson) notFound();

  // Only what the page shows about related lessons goes to the browser.
  if (lesson.kind === 'lick') {
    const standard = lesson.standardId ? catalog.find((e) => e.id === lesson.standardId) : undefined;
    return <LessonScreen lesson={lesson} standard={standard ? { title: standard.title, href: `/lessons/${standard.id}` } : null} licks={[]} />;
  }
  const entry = catalog.find((e) => e.id === lesson.id);
  const licks = licksFor(catalog, entry).map((l) => ({ id: l.id, title: l.title, artist: l.artist, href: `/lessons/${l.id}` }));
  return <LessonScreen lesson={lesson} standard={null} licks={licks} />;
}
