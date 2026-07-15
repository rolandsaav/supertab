import browser from 'webextension-polyfill';
import { SOURCES } from '../search/sources';
import { search, type SearchPool } from '../search/search';
import type { Request, BridgeResponse } from '../bridge/messages';
import type { Kind, SourceToggles } from '../search/parsers';
import { markVisited, forget, seed } from './visited';
import '../modules/search/background';

// Fetched items held between keystrokes, filled lazily per source. Emptied on
// palette-open (freshness) and after an idle service-worker wake, so the next
// search refetches; enabling a source mid-session fetches just that source.
let cache: SearchPool = {};

/** Fetch any enabled source missing from the cache, in parallel. */
async function fillPool(enabled: SourceToggles): Promise<void> {
  const missing = (Object.keys(enabled) as Kind[]).filter(
    (k) => enabled[k] && SOURCES[k] && cache[k] === undefined
  );
  await Promise.all(
    missing.map(async (k) => {
      cache[k] = await SOURCES[k]!.fetch();
    })
  );
}

/** Duplicate a tab without leaving the copy focused, so the palette stays put. */
async function duplicateTab(tabId: string): Promise<void> {
  const [active] = await browser.tabs.query({ currentWindow: true, active: true });
  await browser.tabs.duplicate(Number(tabId));
  if (active?.id != null) {
    await browser.tabs.update(active.id, { active: true });
  }
}

async function handle(request: Request): Promise<BridgeResponse> {
  try {
    switch (request.type) {
      case 'PREPARE_SEARCH':
        // Invalidate so the next search refetches. Delivered before SEARCH, so
        // the open/refresh path always sees fresh data.
        cache = {};
        return { success: true };
      case 'SEARCH': {
        await fillPool(request.enabled);
        const items = search(cache, request.enabled, request.query);
        return { success: true, reqId: request.reqId, items };
      }
      case 'ACTIVATE_TAB':
        await browser.tabs.update(Number(request.tabId), { active: true });
        return { success: true };
      case 'CLOSE_TAB':
        await browser.tabs.remove(Number(request.tabId));
        return { success: true };
      case 'DUPLICATE_TAB':
        await duplicateTab(request.tabId);
        return { success: true };
      case 'OPEN_URL':
        await browser.tabs.create({ url: request.url });
        return { success: true };
      default:
        request satisfies never;
        return { success: false, error: `Unknown request: ${(request as Request).type}` };
    }
  } catch (err) {
    console.error(`[SuperTab] ${request.type} failed:`, err);
    return { success: false, error: String(err) };
  }
}

// Legacy Request handler. RPC envelopes (with a `module` field) belong to the new
// dispatcher, so leave them alone while both paths coexist during migration.
browser.runtime.onMessage.addListener((message: unknown) => {
  if (message && typeof message === 'object' && 'module' in message) return undefined;
  return handle(message as Request);
});

/** Fire-and-forget a visited-set update, logging any failure. */
function track(label: string, task: Promise<unknown>): void {
  task.catch((err) => console.error(`[SuperTab] ${label} failed:`, err));
}

// Seed the visited set once per session so pre-existing tabs don't flag as
// unvisited. Both fire once at session/extension start (not on SW wake).
browser.runtime.onStartup.addListener(() => track('seed', seed()));
browser.runtime.onInstalled.addListener(() => track('seed', seed()));

// Keep the visited set in step with real activity.
browser.tabs.onActivated.addListener(({ tabId }) => track('markVisited', markVisited(tabId)));
browser.tabs.onRemoved.addListener((tabId) => track('forget', forget(tabId)));
