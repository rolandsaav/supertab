import browser from 'webextension-polyfill';

// Must match the `commands` key in both manifests (JSON can't import this const).
export const TOGGLE_PALETTE = 'toggle-palette';

// Background→content envelope; the literal `type` keeps it distinct from the RPC envelope.
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
