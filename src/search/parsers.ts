import type { Tabs } from 'webextension-polyfill';

export interface Item {
  id: string;
  title: string;
  url: string;
  favIconUrl: string;
  lastAccessed: number;
}

export function parseTab(tab: Tabs.Tab, index: number): Item {
  return {
    id: tab.id != null ? String(tab.id) : `tab-${index}`,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    lastAccessed: tab.lastAccessed ?? 0
  };
}
