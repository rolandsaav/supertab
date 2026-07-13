import browser from 'webextension-polyfill';
import type { Item, SourceToggles } from '../search/parsers';
import type { Request, BridgeResponse } from './messages';

type SuccessResponse = Extract<BridgeResponse, { success: true }>;

/** Send a request and reject if the worker reports failure. */
async function send(request: Request): Promise<SuccessResponse> {
  const response = (await browser.runtime.sendMessage(request)) as BridgeResponse;
  if (!response?.success) {
    throw new Error(response?.error ?? `Request ${request.type} failed`);
  }
  return response;
}

/** Fetch tabs from the background service worker. */
export async function getTabs(): Promise<Item[]> {
  const response = await send({ type: 'GET_TABS' });
  return response.items ?? [];
}

/** Signal palette-open so the worker refreshes its item cache. */
export async function prepareSearch(enabled: SourceToggles): Promise<void> {
  await send({ type: 'PREPARE_SEARCH', enabled });
}

/**
 * Run a search in the background. `reqId` round-trips so the caller can drop
 * responses that arrive out of order.
 */
export async function runSearch(
  query: string,
  enabled: SourceToggles,
  reqId: number
): Promise<{ reqId: number; items: Item[] }> {
  const response = await send({ type: 'SEARCH', query, enabled, reqId });
  return { reqId: response.reqId ?? reqId, items: response.items ?? [] };
}

/** Activate (focus) the given tab. */
export async function activateTab(tabId: string): Promise<void> {
  await send({ type: 'ACTIVATE_TAB', tabId });
}

/** Close the given tab. */
export async function closeTab(tabId: string): Promise<void> {
  await send({ type: 'CLOSE_TAB', tabId });
}

/** Duplicate the given tab. */
export async function duplicateTab(tabId: string): Promise<void> {
  await send({ type: 'DUPLICATE_TAB', tabId });
}
