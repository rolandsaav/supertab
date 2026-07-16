import browser from 'webextension-polyfill';
import { registerModule } from '../../bridge/rpc-background';
import { SOURCES } from './providers';
import { search, type SearchPool } from './search';
import type { Kind, SourceToggles } from './parsers';
import type { SearchApi } from './api';
import { MODULE } from './module';

// Fetched items held between keystrokes, filled lazily per source. Emptied on
// palette-open (freshness) so the next search refetches.
let cache: SearchPool = {};

/** Fetch any enabled source missing from the cache, in parallel. */
async function fillPool(enabled: SourceToggles): Promise<void> {
  const missing = (Object.keys(enabled) as Kind[]).filter(
    (kind) => enabled[kind] && SOURCES[kind] && cache[kind] === undefined,
  );
  await Promise.all(
    missing.map(async (kind) => {
      cache[kind] = await SOURCES[kind]!.fetch();
    }),
  );
}

/** Tab ids cross the RPC boundary as strings; the tabs.* API wants numbers. */
const toTabId = (id: string): number => Number(id);

/** Duplicate a tab without leaving the copy focused, so the palette stays put. */
async function duplicateTab(id: string): Promise<void> {
  const [active] = await browser.tabs.query({
    currentWindow: true,
    active: true,
  });
  await browser.tabs.duplicate(toTabId(id));
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
    await browser.tabs.update(toTabId(id), { active: true });
  },
  async closeTab(id) {
    await browser.tabs.remove(toTabId(id));
  },
  duplicateTab,
  async muteTab(id, muted) {
    await browser.tabs.update(toTabId(id), { muted });
  },
  async reloadTab(id) {
    await browser.tabs.reload(toTabId(id));
  },
  async pinTab(id, pinned) {
    await browser.tabs.update(toTabId(id), { pinned });
  },
  async openUrl(url) {
    await browser.tabs.create({ url });
  },
  async openUrlInCurrentTab(url) {
    const [active] = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    if (active?.id != null) {
      await browser.tabs.update(active.id, { url });
    }
  },
};

registerModule(MODULE, handlers);
