import ArrowRight from '@lucide/svelte/icons/arrow-right';
import FolderOpen from '@lucide/svelte/icons/folder-open';
import Link from '@lucide/svelte/icons/link';
import ExternalLink from '@lucide/svelte/icons/external-link';
import DownloadIcon from '@lucide/svelte/icons/download';
import type { RowActions } from '../../shell/list/context';
import type { DownloadEntry } from './parsers';
import { action, openView } from '../../commands/factories';
import { downloadsApi } from './api';
import { MODULE } from './module';
import Downloads from './Downloads.svelte';

/** Root-list entry: opens the downloads view. */
export const downloadsCommand = openView({
  id: MODULE,
  title: 'Search Downloads',
  icon: DownloadIcon,
  keywords: ['downloads', 'files', 'saved'],
  view: Downloads,
});

/** A result's actions — the primary runs on Enter, the secondaries fill the panel. */
export function commandsForDownload(
  _entry: DownloadEntry,
): RowActions<DownloadEntry> {
  return {
    primary: action<DownloadEntry>({
      id: 'open-file',
      title: 'Open File',
      icon: ArrowRight,
      do: (d) => downloadsApi.openFile(d.id),
    }),
    secondary: [
      action<DownloadEntry>({
        id: 'show-in-folder',
        title: 'Show in Folder',
        icon: FolderOpen,
        do: (d) => downloadsApi.showFile(d.id),
        after: 'stay',
      }),
      action<DownloadEntry>({
        id: 'copy-url',
        title: 'Copy Source URL',
        icon: Link,
        shortcut: { mod: true, key: 'c' },
        do: (d) => navigator.clipboard.writeText(d.url),
        after: 'stay',
      }),
      action<DownloadEntry>({
        id: 'open-url',
        title: 'Open Source URL',
        icon: ExternalLink,
        do: (d) => downloadsApi.openUrl(d.url),
      }),
    ],
  };
}
