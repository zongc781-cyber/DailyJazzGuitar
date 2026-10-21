import type { Metadata } from 'next';
import { getCatalog } from '@/server/library';
import { WeekScreen } from '@/components/screens/WeekScreen';

export const metadata: Metadata = { title: 'This Week' };

export const revalidate = 300;

export default async function WeekPage() {
  const catalog = await getCatalog();
  return <WeekScreen catalog={catalog} />;
}
