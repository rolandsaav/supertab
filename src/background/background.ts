import browser from 'webextension-polyfill';
import { markVisited, forget, seed } from './visited';
import { TOGGLE_PALETTE, sendPaletteCommand } from '../bridge/commands';
import '../modules/search/background';

/** Fire-and-forget a visited-set update, logging any failure. */
function track(label: string, task: Promise<unknown>): void {
  task.catch((err) => console.error(`[SuperTab] ${label} failed:`, err));
}

/** Relay a palette command to the active tab; rejects on unreachable tabs (e.g. chrome://). */
async function relayToActiveTab(name: string): Promise<void> {
  const [active] = await browser.tabs.query({ currentWindow: true, active: true });
  if (active?.id !== undefined) await sendPaletteCommand(active.id, name);
}

// Seed the visited set once per session so pre-existing tabs don't flag as
// unvisited. Both fire once at session/extension start (not on SW wake).
browser.runtime.onStartup.addListener(() => track('seed', seed()));
browser.runtime.onInstalled.addListener(() => track('seed', seed()));

// Keep the visited set in step with real activity.
browser.tabs.onActivated.addListener(({ tabId }) => track('markVisited', markVisited(tabId)));
browser.tabs.onRemoved.addListener((tabId) => track('forget', forget(tabId)));

// Command shortcuts fire only in the worker; forward the intent to the page, which owns the state.
browser.commands.onCommand.addListener((name) => {
  switch (name) {
    case TOGGLE_PALETTE:
      track('toggle-palette', relayToActiveTab(name));
      break;
  }
});
