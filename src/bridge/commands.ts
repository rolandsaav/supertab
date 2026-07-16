import browser from 'webextension-polyfill';

// Must stay identical to the `commands` key declared in public/manifest-chrome.json
// and public/manifest-firefox.json. Those manifests are JSON and cannot import this
// const, so the two are kept in sync by hand.
export const TOGGLE_PALETTE = 'toggle-palette';

/**
 * Envelope for a background→content command. The literal `type` field keeps this
 * distinct from the RPC envelope (`{ module, op, args }` in ./rpc), so neither
 * listener ever mistakes one message for the other.
 */
export interface PaletteCommandMessage {
  type: 'supertab:command';
  name: string;
}

/** True when a message is one of our palette command envelopes. */
export function isPaletteCommand(message: unknown): message is PaletteCommandMessage {
  const candidate = message as Partial<PaletteCommandMessage>;
  return candidate?.type === 'supertab:command' && typeof candidate?.name === 'string';
}

/** Send one palette command to a tab. Rejections propagate to the caller. */
export function sendPaletteCommand(tabId: number, name: string): Promise<void> {
  const message: PaletteCommandMessage = { type: 'supertab:command', name };
  return browser.tabs.sendMessage(tabId, message) as Promise<void>;
}
