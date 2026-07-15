import browser from 'webextension-polyfill';
import { registerModule } from '../../bridge/rpc-background';
import { SOURCES } from '../../search/sources';
import { search, type SearchPool } from '../../search/search';
import type { Kind, SourceToggles } from '../../search/parsers';
import type { SearchApi } from './api';
import { MODULE } from './module';

// Fetched items held between keystrokes, filled lazily per source. Emptied on
// palette-open (freshness) so the next search refetches.
let cache: SearchPool = {};

/** Fetch any enabled source missing from the cache, in parallel. */
async function fillPool(enabled: SourceToggles): Promise<void> {
  const missing = (Object.keys(enabled) as Kind[]).filter(
    (kind) => enabled[kind] && SOURCES[kind] && cache[kind] === undefined
  );
  await Promise.all(
    missing.map(async (kind) => {
      cache[kind] = await SOURCES[kind]!.fetch();
    })
  );
}

/** Duplicate a tab without leaving the copy focused, so the palette stays put. */
async function duplicateTab(id: string): Promise<void> {
  const [active] = await browser.tabs.query({ currentWindow: true, active: true });
  await browser.tabs.duplicate(Number(id));
  if (active?.id != null) {
    await browser.tabs.update(active.id, { active: true });
  }
}

const handlers: SearchApi = {
  async prepare() {
    cache = {};
  },
  async query(query, enabled, reqId) {
    await fillPool(enabled);
    return { reqId, items: search(cache, enabled, query) };
  },
  async activateTab(id) {
    await browser.tabs.update(Number(id), { active: true });
  },
  async closeTab(id) {
    await browser.tabs.remove(Number(id));
  },
  duplicateTab,
  async openUrl(url) {
    await browser.tabs.create({ url });
  }
};

registerModule(MODULE, handlers);
