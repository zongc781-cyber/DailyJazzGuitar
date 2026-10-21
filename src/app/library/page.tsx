import type { Metadata } from 'next';
import { getCatalog } from '@/server/library';
import { LibraryScreen, type LibraryTab } from '@/components/screens/LibraryScreen';

export const metadata: Metadata = { title: 'Library' };

const TABS: LibraryTab[] = ['history', 'learned', 'favourites', 'all'];

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const [catalog, { tab }] = await Promise.all([getCatalog(), searchParams]);
  const initialTab = TABS.find((t) => t === tab) ?? 'history';
  return <LibraryScreen catalog={catalog} initialTab={initialTab} />;
}
