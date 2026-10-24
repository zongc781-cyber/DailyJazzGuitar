import type { Metadata } from 'next';
import { getCatalog } from '@/server/library';
import { TodayScreen } from '@/components/screens/TodayScreen';

// A layout's title template skips a page in its own folder, so this one names the app itself.
export const metadata: Metadata = { title: { absolute: 'Today · Journal' } };

// The catalogue changes when a generated lesson is published; which lesson is today's is decided in
// the browser, from the learner's local date and saved assignments.
export const revalidate = 300;

export default async function TodayPage() {
  const catalog = await getCatalog();
  return <TodayScreen catalog={catalog} />;
}
