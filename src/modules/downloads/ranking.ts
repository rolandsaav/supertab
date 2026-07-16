import { order } from '../../lib/fuzzy';
import type { DownloadEntry } from './parsers';

export const RESULT_CAP = 50;

const searchableText = (entry: DownloadEntry): string => `${entry.filename} ${entry.url}`;

/** Empty query → most recent first. Otherwise → engine relevance. */
export function rank(entries: DownloadEntry[], query: string): DownloadEntry[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return [...entries].sort((a, b) => b.startTime - a.startTime).slice(0, RESULT_CAP);
  }

  const idxs = order(entries.map(searchableText), trimmed);
  return idxs.slice(0, RESULT_CAP).map((i) => entries[i]);
}
