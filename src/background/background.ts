import browser from 'webextension-polyfill';
import { SOURCES } from '../search/sources';
import { search, type SearchPool } from '../search/search';
import type { Request, BridgeResponse } from '../bridge/messages';
import type { Kind, SourceToggles } from '../search/parsers';
import { markVisited, forget, seed } from './visited';

/** Fetch the enabled sources' items in parallel. */
async function fetchPool(enabled: SourceToggles): Promise<SearchPool> {
  const kinds = (Object.keys(enabled) as Kind[]).filter((k) => enabled[k] && SOURCES[k]);
  const pairs = await Promise.all(
    kinds.map(async (k) => [k, await SOURCES[k]!.fetch()] as const)
  );
  return Object.fromEntries(pairs);
}

// Fetched items held between keystrokes. Null means "refetch on next search" —
// set on palette-open (freshness) and after an idle service-worker wake.
let cache: SearchPool | null = null;

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
        cache = null;
        return { success: true };
      case 'SEARCH': {
        cache ??= await fetchPool(request.enabled);
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
      default:
        request satisfies never;
        return { success: false, error: `Unknown request: ${(request as Request).type}` };
    }
  } catch (err) {
    console.error(`[SuperTab] ${request.type} failed:`, err);
    return { success: false, error: String(err) };
  }
}

browser.runtime.onMessage.addListener((message: unknown) => handle(message as Request));

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
