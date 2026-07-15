import { getContext } from 'svelte';
import type { Command } from '../../commands/command';

/** A registered row: its action list plus the subject those actions act on. */
export interface ItemEntry {
  subject: unknown;
  actions: Command<any>[];
}

/** The List↔ListItem seam. ListItem registers itself; List drives footer/Enter/panel. */
export interface ListContext {
  register(id: string, entry: ItemEntry): void;
  unregister(id: string): void;
  select(id: string): void;
  openActions(id: string): void;
}

export const LIST_KEY = Symbol('list');

export function getListContext(): ListContext {
  return getContext(LIST_KEY);
}
