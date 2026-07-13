import browser from 'webextension-polyfill';
import { getVisited } from '../background/visited';
import { parseTab } from './parsers';
import type { Item, Kind } from './parsers';

export interface Source {
  kind: Kind;
  label: string;
  /** Precedence: lower wins, e.g. for a future cross-source tiebreak. */
  order: number;
  /** Fetch this source's items. Invoked in the background only. */
  fetch: () => Promise<Item[]>;
}

/** All tabs in the current window except the active one (the page behind the palette). */
async function fetchTabs(): Promise<Item[]> {
  const [tabs, visited] = await Promise.all([
    browser.tabs.query({ currentWindow: true, active: false }),
    getVisited()
  ]);
  return tabs.map((tab, i) => {
    const item = parseTab(tab, i);
    return { ...item, visited: visited.has(item.id) };
  });
}

/** Registered sources, keyed by kind. Bookmarks/history join in later phases. */
export const SOURCES: Partial<Record<Kind, Source>> = {
  tab: { kind: 'tab', label: 'Tabs', order: 0, fetch: fetchTabs }
};
