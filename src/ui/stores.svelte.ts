import { prepareSearch, runSearch } from '../bridge/background-bridge';
import type { Item, SourceToggles } from '../search/parsers';
import type { Action } from '../actions/registry';

class PaletteStore {
  visible = $state(false);
  query = $state('');
  results = $state<Item[]>([]);
  isLoading = $state(false);
  error = $state('');

  /** Which sources the search covers. Tabs only, until toggled on. */
  enabled = $state<SourceToggles>({ tab: true, bookmark: true, history: false }); // TEMP: on by default until the toggle UI exists

  /** Which surface has focus: the result list, or the actions panel. */
  mode = $state<'list' | 'actions'>('list');

  /** `id` of the currently highlighted result. */
  highlightedId = $state('');

  #reqSeq = 0;

  /** Open the palette with fresh ephemeral state. */
  open(): void {
    this.query = '';
    this.error = '';
    this.mode = 'list';
    this.highlightedId = '';
    this.visible = true;
    // Refresh the cache before the effect fires the first search (messages are ordered, so PREPARE lands before SEARCH).
    void this.prepare();
  }

  /** Invalidate the background cache so the next search refetches. */
  async prepare(): Promise<void> {
    try {
      await prepareSearch($state.snapshot(this.enabled));
    } catch (err) {
      this.#reportError(err, 'Failed to refresh');
    }
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

  #reportError(err: unknown, fallback: string): void {
    this.error = err instanceof Error ? err.message : fallback;
    console.error('[SuperTab]', err);
  }

  /** Search the enabled sources. Out-of-order responses are discarded via reqId. */
  async runQuery(query: string, enabled: SourceToggles): Promise<void> {
    const id = ++this.#reqSeq;
    try {
      // enabled is a reactive proxy; snapshot it so it survives structured clone over IPC.
      const clean = $state.snapshot(enabled) as SourceToggles;
      const { reqId, items } = await runSearch(query, clean, id);
      if (reqId === this.#reqSeq) this.results = items;
    } catch (err) {
      if (id === this.#reqSeq) this.#reportError(err, 'Search failed');
    }
  }

  /** Run an action, then honor its `after`: close the palette, or refresh and stay. */
  async runAction(action: Action, item: Item): Promise<void> {
    try {
      await action.run(item);
    } catch (err) {
      this.#reportError(err, `Could not ${action.label.toLowerCase()}`);
      this.closeActions();
      return;
    }
    if (action.after === 'close') {
      this.close();
    } else {
      await this.prepare();
      await this.runQuery(this.query, this.enabled);
      this.closeActions();
    }
  }
}

export const store = new PaletteStore();
