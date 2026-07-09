import browser from 'webextension-polyfill';
import { parseTab } from '../search/parsers';
import type { Item } from '../search/parsers';
import type { Request, BridgeResponse } from '../bridge/messages';

/** Fetch all tabs in the current window. */
async function getTabs(): Promise<Item[]> {
  const tabs = await browser.tabs.query({ currentWindow: true });
  return tabs.map(parseTab);
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
