import browser from 'webextension-polyfill';
import { markVisited, forget, seed } from './visited';
import '../modules/search/background';

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
