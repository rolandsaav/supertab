/**
 * UI State — Svelte 5 runes
 *
 * Exported as a single reactive object. Tab data is cached here.
 */

import { buildIndex, search } from '../search/fuse-index';
import type { Item } from '../search/parsers';

class PaletteStore {
  visible = $state(false);
  query = $state('');
  tabs = $state<Item[]>([]);
  isLoading = $state(false);
  error = $state('');

  /** Fuse index, rebuilt automatically whenever `tabs` changes. */
  #index = $derived(buildIndex(this.tabs));

  /** Search results: recency-sorted when query is empty, Fuse-ranked otherwise. */
  results = $derived(search(this.#index, this.tabs, this.query));

  /** Open the palette with fresh ephemeral state. Cached tabs are kept. */
  open(): void {
    this.query = '';
    this.error = '';
    this.visible = true;
  }

  /** Close the palette. */
  close(): void {
    this.visible = false;
  }

  /** Populate tabs. The Fuse index rebuilds reactively via `#index`. */
  setTabs(newTabs: Item[]): void {
    this.tabs = newTabs;
  }
}

export const store = new PaletteStore();
