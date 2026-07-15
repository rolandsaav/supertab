import ArrowRight from '@lucide/svelte/icons/arrow-right';
import X from '@lucide/svelte/icons/x';
import Link from '@lucide/svelte/icons/link';
import Copy from '@lucide/svelte/icons/copy';
import SearchIcon from '@lucide/svelte/icons/search';
import type { Command } from '../../commands/command';
import type { Item } from '../../search/parsers';
import { searchApi } from './api';
import { MODULE } from './module';
import Search from './Search.svelte';

/** Root-list entry: opens the search view. */
export const searchCommand: Command = {
  id: MODULE,
  title: 'Search Tabs, Bookmarks & History',
  icon: SearchIcon,
  keywords: ['tabs', 'bookmarks', 'history', 'find'],
  run: { kind: 'view', view: Search }
};

// Content-side only — no background needed, so no api call.
const copyUrl: Command<Item> = {
  id: 'copy-url',
  title: 'Copy URL',
  icon: Link,
  shortcut: { mod: true, key: 'c' },
  run: { kind: 'perform', perform: (entry) => navigator.clipboard.writeText(entry.url), after: 'stay' }
};

/** Commands for a result — [0] is the primary (Enter) action, the rest fill the panel. */
export function commandsForItem(item: Item): Command<Item>[] {
  if (item.kind === 'tab') {
    return [
      {
        id: 'activate',
        title: 'Activate',
        icon: ArrowRight,
        run: { kind: 'perform', perform: (tab) => searchApi.activateTab(tab.id), after: 'close' }
      },
      {
        id: 'close',
        title: 'Close Tab',
        icon: X,
        shortcut: { mod: true, key: 'Backspace' },
        run: { kind: 'perform', perform: (tab) => searchApi.closeTab(tab.id), after: 'stay' }
      },
      copyUrl,
      {
        id: 'duplicate',
        title: 'Duplicate Tab',
        icon: Copy,
        run: { kind: 'perform', perform: (tab) => searchApi.duplicateTab(tab.id), after: 'stay' }
      }
    ];
  }
  return [
    {
      id: 'open',
      title: 'Open in New Tab',
      icon: ArrowRight,
      run: { kind: 'perform', perform: (entry) => searchApi.openUrl(entry.url), after: 'close' }
    },
    copyUrl
  ];
}
