import type { Metadata } from 'next';
import { getCatalog } from '@/server/library';
import { ProgressScreen } from '@/components/screens/ProgressScreen';

export const metadata: Metadata = { title: 'Progress' };

export const revalidate = 300;

export default async function ProgressPage() {
  const catalog = await getCatalog();
  return <ProgressScreen catalog={catalog} />;
}
