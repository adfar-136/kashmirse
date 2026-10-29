import type { Variant } from '../src/shared/lib/types';

/** Preserve existing option identity and reservations when improving seed descriptions or adding sizes. */
export function mergeSeedVariants(existing: Variant[], desired: Variant[]): Variant[] {
  const labelMatches = new Map(
    desired.map((v) => [v.label, existing.find((old) => old.label === v.label)]),
  );
  const reservedIds = new Set([...labelMatches.values()].filter(Boolean).map((v) => v!.id));
  const used = new Set<string>();
  const result = desired.map((v) => {
    const old =
      labelMatches.get(v.label) ||
      existing.find((old) => old.id === v.id && !reservedIds.has(old.id) && !used.has(old.id));
    let id = old?.id || v.id;
    if (!old && (reservedIds.has(id) || used.has(id))) id = v.id + '-new';
    if (used.has(id)) throw new Error('Duplicate option ID during catalogue migration');
    used.add(id);
    return { ...v, id, stock: old?.stock ?? v.stock };
  });
  if (existing.some((v) => !used.has(v.id)))
    throw new Error('Catalogue migration cannot remove an existing option');
  return result;
}
