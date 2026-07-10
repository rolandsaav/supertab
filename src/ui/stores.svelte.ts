/**
 * UI State — Svelte 5 runes
 *
 * Exported as a single reactive object. Tab data is cached here.
 */

import { buildIndex, search } from '../search/fuse-index';
import { getTabs } from '../bridge/background-bridge';
import type { Item } from '../search/parsers';
import type { Action } from '../actions/registry';

class PaletteStore {
  visible = $state(false);
  query = $state('');
  tabs = $state<Item[]>([]);
  isLoading = $state(false);
  error = $state('');

  /** Which surface has focus: the result list, or the actions panel. */
  mode = $state<'list' | 'actions'>('list');

  /** `id` of the currently highlighted result. */
  highlightedId = $state('');

  /** Fuse index, rebuilt automatically whenever `tabs` changes. */
  #index = $derived(buildIndex(this.tabs));

  /** Search results: recency-sorted when query is empty, Fuse-ranked otherwise. */
  results = $derived(search(this.#index, this.tabs, this.query));

  /** Open the palette with fresh ephemeral state. Cached tabs are kept. */
  open(): void {
    this.query = '';
    this.error = '';
    this.mode = 'list';
    this.highlightedId = '';
    this.visible = true;
  }

  /** Close the palette. */
  close(): void {
    this.visible = false;
  }

  openActions(): void {
    this.mode = 'actions';
  }

  closeActions(): void {
    this.mode = 'list';
  }

  /** Populate tabs. The Fuse index rebuilds reactively via `#index`. */
  setTabs(newTabs: Item[]): void {
    this.tabs = newTabs;
  }

  async refetch(): Promise<void> {
    this.isLoading = true;
    this.error = '';
    try {
      this.setTabs(await getTabs());
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load data';
      console.error('[SuperTab]', err);
    } finally {
      this.isLoading = false;
    }
  }

  /** Run an action, then honor its `after`: close the palette, or refetch and stay. */
  async runAction(action: Action, item: Item): Promise<void> {
    await action.run(item);
    if (action.after === 'close') {
      this.close();
    } else {
      await this.refetch();
      this.closeActions();
    }
  }
}

export const store = new PaletteStore();
