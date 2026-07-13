import browser from 'webextension-polyfill';
import type { Bookmarks, History } from 'webextension-polyfill';
import { getVisited } from '../background/visited';
import { parseTab, parseBookmark, parseHistory } from './parsers';
import type { Item, Kind } from './parsers';

const HISTORY_WINDOW_DAYS = 90;
const HISTORY_MAX_RESULTS = 1000;
const HISTORY_RECENT_N = 100;
const HISTORY_TOP_N = 200;

export interface Source {
  kind: Kind;
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

/** All bookmarks with a URL, flattened from the bookmark tree. */
async function fetchBookmarks(): Promise<Item[]> {
  const tree = await browser.bookmarks.getTree();
  const items: Item[] = [];
  const walk = (nodes: Bookmarks.BookmarkTreeNode[]) => {
    for (const node of nodes) {
      if (node.url) items.push(parseBookmark(node));
      if (node.children) walk(node.children);
    }
  };
  walk(tree);
  return items;
}

/** Recent plus most-visited history within a bounded window, merged by URL. */
async function fetchHistory(): Promise<Item[]> {
  const startTime = Date.now() - HISTORY_WINDOW_DAYS * 864e5;
  const pool = await browser.history.search({
    text: '',
    startTime,
    maxResults: HISTORY_MAX_RESULTS
  });
  const recent = [...pool]
    .sort((a, b) => (b.lastVisitTime ?? 0) - (a.lastVisitTime ?? 0))
    .slice(0, HISTORY_RECENT_N);
  const top = [...pool]
    .sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
    .slice(0, HISTORY_TOP_N);
  const merged = new Map<string, History.HistoryItem>();
  for (const h of [...recent, ...top]) {
    if (h.url) merged.set(h.url, h);
  }
  return [...merged.values()].map(parseHistory);
}

/** Registered sources, keyed by kind. */
export const SOURCES: Partial<Record<Kind, Source>> = {
  tab: { kind: 'tab', order: 0, fetch: fetchTabs },
  bookmark: { kind: 'bookmark', order: 1, fetch: fetchBookmarks },
  history: { kind: 'history', order: 2, fetch: fetchHistory }
};
