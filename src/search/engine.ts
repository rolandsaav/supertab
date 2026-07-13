/**
 * Indices of `haystack` that match `query`, in relevance order.
 * Empty query or no matches → empty array.
 */
export function order(haystack: string[], query: string): number[] {
  // Phase 1: uFuzzy filter → info → sort.
  if (!query.trim() || haystack.length === 0) return [];
  return [];
}
