import type { Item } from '../search/parsers';

/** Requests the content script sends to the background worker. */
export type Request =
  | { type: 'GET_TABS' }
  | { type: 'ACTIVATE_TAB'; tabId: string };

/** Discriminant of every request type. */
export type MessageType = Request['type'];

/** Reply shape the background worker sends back to the content script. */
export type BridgeResponse =
  | { success: true; items?: Item[] }
  | { success: false; error: string };
