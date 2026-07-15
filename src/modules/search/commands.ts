import ArrowRight from '@lucide/svelte/icons/arrow-right';
import X from '@lucide/svelte/icons/x';
import Link from '@lucide/svelte/icons/link';
import Copy from '@lucide/svelte/icons/copy';
import SearchIcon from '@lucide/svelte/icons/search';
import type { Command } from '../../commands/command';
import type { Item } from '../../search/parsers';
import { action, openView } from '../../commands/factories';
import { searchApi } from './api';
import { MODULE } from './module';
import Search from './Search.svelte';

/** Root-list entry: opens the search view. */
export const searchCommand = openView({
  id: MODULE,
  title: 'Search Tabs, Bookmarks & History',
  icon: SearchIcon,
  keywords: ['tabs', 'bookmarks', 'history', 'find'],
  view: Search
});

// Content-side only — no background needed, so no api call.
const copyUrl = action<Item>({
  id: 'copy-url',
  title: 'Copy URL',
  icon: Link,
  shortcut: { mod: true, key: 'c' },
  do: (entry) => navigator.clipboard.writeText(entry.url),
  after: 'stay'
});

/** Commands for a result — [0] is the primary (Enter) action, the rest fill the panel. */
export function commandsForItem(item: Item): Command<Item>[] {
  if (item.kind === 'tab') {
    return [
      action<Item>({ id: 'activate', title: 'Activate', icon: ArrowRight, do: (tab) => searchApi.activateTab(tab.id) }),
      action<Item>({
        id: 'close',
        title: 'Close Tab',
        icon: X,
        shortcut: { mod: true, key: 'Backspace' },
        do: (tab) => searchApi.closeTab(tab.id),
        after: 'stay'
      }),
      copyUrl,
      action<Item>({ id: 'duplicate', title: 'Duplicate Tab', icon: Copy, do: (tab) => searchApi.duplicateTab(tab.id), after: 'stay' })
    ];
  }
  return [
    action<Item>({ id: 'open', title: 'Open in New Tab', icon: ArrowRight, do: (entry) => searchApi.openUrl(entry.url) }),
    copyUrl
  ];
}
