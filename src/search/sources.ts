import type { Item, Kind } from './parsers';

export interface Source {
  kind: Kind;
  /** Display name (used by the toggle UI). */
  label: string;
  /** Precedence: lower wins, e.g. for a future cross-source tiebreak. */
  order: number;
  /** Fetch this source's items. Invoked in the background only. */
  fetch: () => Promise<Item[]>;
}

/**
 * Registered sources, keyed by kind. `Partial` because only implemented
 * sources appear — bookmarks/history join in later phases.
 */
export const SOURCES: Partial<Record<Kind, Source>> = {
  tab: {
    kind: 'tab',
    label: 'Tabs',
    order: 0,
    // Phase 1: wire to the real tab fetch (chrome.tabs + visited set).
    fetch: async () => []
  }
};
