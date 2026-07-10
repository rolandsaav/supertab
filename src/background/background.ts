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

async function handleGetTabs(): Promise<BridgeResponse> {
  try {
    return { success: true, items: await getTabs() };
  } catch (err) {
    console.error('[SuperTab] GET_TABS failed:', err);
    return { success: false, error: String(err) };
  }
}

async function handleActivateTab(tabId: string): Promise<BridgeResponse> {
  try {
    await browser.tabs.update(Number(tabId), { active: true });
    return { success: true };
  } catch (err) {
    console.error('[SuperTab] ACTIVATE_TAB failed:', err);
    return { success: false, error: String(err) };
  }
}

browser.runtime.onMessage.addListener((message: unknown) => {
  const request = message as Request;

  if (request?.type === 'GET_TABS') {
    return handleGetTabs();
  }

  if (request?.type === 'ACTIVATE_TAB' && request.tabId != null) {
    return handleActivateTab(request.tabId);
  }

  // Unknown message type — no response.
  return undefined;
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
