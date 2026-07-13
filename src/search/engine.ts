import uFuzzy from '@leeoniya/ufuzzy';

// intraMode 1 = single-error typo tolerance (one insert/delete/substitute/
// transpose per term).
const UFUZZY_OPTS: uFuzzy.Options = { intraMode: 1 };
const uf = new uFuzzy(UFUZZY_OPTS);

/**
 * Indices of `haystack` that match `query`, in relevance order.
 * Empty query or no matches → empty array.
 */
export function order(haystack: string[], query: string): number[] {
  const needle = query.trim();
  if (!needle || haystack.length === 0) return [];

  const idxs = uf.filter(haystack, needle);
  if (!idxs || idxs.length === 0) return [];

  const info = uf.info(idxs, haystack, needle);
  const sorted = uf.sort(info, haystack, needle);
  return sorted.map((i) => info.idx[i]);
}
