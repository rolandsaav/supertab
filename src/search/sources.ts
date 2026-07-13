import browser from 'webextension-polyfill';
import type { Bookmarks } from 'webextension-polyfill';
import { getVisited } from '../background/visited';
import { parseTab, parseBookmark } from './parsers';
import type { Item, Kind } from './parsers';

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

/** Registered sources, keyed by kind. */
export const SOURCES: Partial<Record<Kind, Source>> = {
  tab: { kind: 'tab', order: 0, fetch: fetchTabs },
  bookmark: { kind: 'bookmark', order: 1, fetch: fetchBookmarks }
};
