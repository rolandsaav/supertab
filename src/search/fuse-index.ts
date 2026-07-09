import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Item } from './parsers';

export const FUSE_OPTIONS: IFuseOptions<Item> = {
  keys: ['title', 'url'],
  threshold: 0.4,
  includeScore: true
};

/** Build a Fuse index over the given items. */
export function buildIndex(items: Item[]): Fuse<Item> {
  return new Fuse(items, FUSE_OPTIONS);
}

/** Search `items` via `index`. Empty query returns all items sorted by recency. */
export function search(index: Fuse<Item>, items: Item[], query: string): Item[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [...items].sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  return index.search(trimmed).map((r) => r.item);
}
