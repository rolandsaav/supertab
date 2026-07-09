import browser from 'webextension-polyfill';
import type { Item } from '../search/parsers';
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

/** Activate (focus) the given tab. */
export async function activateTab(tabId: string): Promise<void> {
  await send({ type: 'ACTIVATE_TAB', tabId });
}
