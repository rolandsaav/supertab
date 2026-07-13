import type { Item, SourceToggles } from '../search/parsers';

/** Requests the content script sends to the background worker. */
export type Request =
  | { type: 'PREPARE_SEARCH'; enabled: SourceToggles }
  | { type: 'SEARCH'; query: string; enabled: SourceToggles; reqId: number }
  | { type: 'ACTIVATE_TAB'; tabId: string }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'DUPLICATE_TAB'; tabId: string }
  | { type: 'OPEN_URL'; url: string };

/** Discriminant of every request type. */
export type MessageType = Request['type'];

/**
 * Reply shape the background worker sends back to the content script.
 * `reqId` echoes the SEARCH request so the caller can discard stale responses.
 */
export type BridgeResponse =
  | { success: true; items?: Item[]; reqId?: number }
  | { success: false; error: string };
