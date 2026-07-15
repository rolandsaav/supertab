import type { Component } from 'svelte';
import AppWindow from '@lucide/svelte/icons/app-window';
import Bookmark from '@lucide/svelte/icons/bookmark';
import History from '@lucide/svelte/icons/history';
import type { Kind, SourceToggles } from '../../search/parsers';

interface SourceMeta {
  label: string;
  icon: Component;
  /** The @-command that enables this source when it is the entire input. */
  command: string;
}

/** Presentation metadata per source — the single home for icons, labels, and @-commands. */
export const SOURCE_META: Record<Kind, SourceMeta> = {
  tab: { label: 'Tabs', icon: AppWindow, command: '@t' },
  bookmark: { label: 'Bookmarks', icon: Bookmark, command: '@b' },
  history: { label: 'History', icon: History, command: '@h' }
};

/** Left-to-right display order of the source toggle icons — the declaration order
 * of SOURCE_META, so adding a source needs only a SOURCE_META entry. */
export const SOURCE_ORDER = Object.keys(SOURCE_META) as Kind[];

/** The source a whole-input @-command enables, or null when the input is not one. */
export function parseSourceCommand(input: string): Kind | null {
  const match = (Object.keys(SOURCE_META) as Kind[]).find(
    (kind) => SOURCE_META[kind].command === input
  );
  return match ?? null;
}

const listFormat = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/** Input placeholder naming the enabled sources, e.g. "Search tabs and history…". */
export function searchPlaceholder(enabled: SourceToggles): string {
  const names = SOURCE_ORDER.filter((kind) => enabled[kind]).map((kind) =>
    SOURCE_META[kind].label.toLowerCase()
  );
  return `Search ${listFormat.format(names)}…`;
}
