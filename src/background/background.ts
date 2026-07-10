import browser from 'webextension-polyfill';
import { parseTab } from '../search/parsers';
import type { Item } from '../search/parsers';
import type { Request, BridgeResponse } from '../bridge/messages';
import { getVisited, markVisited, forget, seed } from './visited';

/**
 * Fetch all tabs in the current window, minus the active one — the palette
 * overlays the active tab, so it's the page you're already on.
 */
async function getTabs(): Promise<Item[]> {
  const [tabs, visited] = await Promise.all([
    browser.tabs.query({ currentWindow: true, active: false }),
    getVisited()
  ]);
  return tabs.map((tab, i) => {
    const item = parseTab(tab, i);
    return { ...item, visited: visited.has(item.id) };
  });
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
      case 'GET_TABS':
        return { success: true, items: await getTabs() };
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
