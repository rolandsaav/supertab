import { order } from '../../lib/fuzzy';
import type { Item } from './parsers';

/** Max results surfaced to the UI — single home for the cap. */
export const RESULT_CAP = 50;

/**
 * Host + path of a URL, dropping the scheme/query/hash noise every URL carries.
 * Hostname is kept on purpose — searching by domain ("github") is a primary use
 * case. Uses the WHATWG URL parser; falls back to the raw string if it won't parse.
 */
function cleanUrl(raw: string): string {
  try {
    const { hostname, pathname } = new URL(raw);
    return hostname + pathname;
  } catch {
    return raw;
  }
}

/** The text a query is matched against — single home for searchable fields. */
const searchableText = (item: Item): string =>
  `${item.title} ${cleanUrl(item.url)}`;

/** Unfiltered order: pinned tabs float to the top, ties broken by most recently accessed. */
function pinnedThenRecent(a: Item, b: Item): number {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }
  return b.lastAccessed - a.lastAccessed;
}

/**
 * Order items for display and cap the count.
 * Empty query → pinned tabs first, then most recently accessed. Otherwise → engine relevance.
 */
export function rank(items: Item[], query: string): Item[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [...items].sort(pinnedThenRecent).slice(0, RESULT_CAP);
  }

  // Normalize the query the same way as the haystack, so pasting a full URL
  // (scheme/query/hash and all) still matches the cleaned url text.
  const idxs = order(items.map(searchableText), cleanUrl(trimmed) || trimmed);
  return idxs.slice(0, RESULT_CAP).map((i) => items[i]);
}
