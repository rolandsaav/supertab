import type { Tabs } from 'webextension-polyfill';

export interface Item {
  kind: 'tab' | 'bookmark' | 'history';
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
