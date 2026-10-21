// Catalogue helpers shared by server pages and client screens.

import type { CatalogEntry } from './music/types';

/** A standard's licks in teaching order: its own list first, then generated licks written for it. */
export function licksFor(catalog: CatalogEntry[], standard: CatalogEntry | undefined): CatalogEntry[] {
  if (!standard) return [];
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const listed = (standard.lickIds ?? []).map((id) => byId.get(id)).filter((e): e is CatalogEntry => e?.kind === 'lick');
  const extra = catalog.filter((e) => e.kind === 'lick' && e.standardId === standard.id && !standard.lickIds?.includes(e.id));
  return [...listed, ...extra];
}
