import type { Tabs } from 'webextension-polyfill';

export type Kind = 'tab' | 'bookmark' | 'history';

/** Which sources a search should cover. */
export type SourceToggles = Record<Kind, boolean>;

export interface Item {
  kind: Kind;
  id: string;
  title: string;
  url: string;
  favIconUrl: string;
  lastAccessed: number;
  /** Only meaningful for tabs — whether it's been activated this session. */
  visited: boolean;
}

export function parseTab(tab: Tabs.Tab, index: number): Item {
  return {
    kind: 'tab',
    id: tab.id != null ? String(tab.id) : `tab-${index}`,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    lastAccessed: tab.lastAccessed ?? 0,
    visited: false
  };
}
