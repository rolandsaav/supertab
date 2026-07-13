import type { Component } from 'svelte';
import AppWindow from '@lucide/svelte/icons/app-window';
import Bookmark from '@lucide/svelte/icons/bookmark';
import History from '@lucide/svelte/icons/history';
import type { Kind } from '../search/parsers';

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

/** Left-to-right display order of the source toggle icons. */
export const SOURCE_ORDER: Kind[] = ['tab', 'bookmark', 'history'];

/** The source a whole-input @-command enables, or null when the input is not one. */
export function parseSourceCommand(input: string): Kind | null {
  const match = (Object.keys(SOURCE_META) as Kind[]).find(
    (kind) => SOURCE_META[kind].command === input
  );
  return match ?? null;
}
