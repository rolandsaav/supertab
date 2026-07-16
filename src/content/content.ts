import browser from 'webextension-polyfill';
import { mountApp } from './mount';
import { nav } from '../shell/nav.svelte';
import { searchCommand } from '../modules/search/commands';
import { TOGGLE_PALETTE, isPaletteCommand } from '../bridge/commands';

const HOST_ID = 'supertab-host';

console.log('[SuperTab] Content script loaded');

function init(): void {
  console.log('[SuperTab] init() called, body exists:', !!document.body);
  if (document.getElementById(HOST_ID)) {
    console.log('[SuperTab] Host already exists');
    return;
  }

  try {
    // Isolated host node.
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.top = '0';
    host.style.left = '0';
    host.style.width = '0';
    host.style.height = '0';
    host.style.zIndex = '2147483647';
    document.body.appendChild(host);
    console.log('[SuperTab] Host created');

    const shadow = host.attachShadow({ mode: 'open' });
    console.log('[SuperTab] Shadow root attached');

    // mountApp injects the styles into the shadow root.
    mountApp(shadow);
    console.log('[SuperTab] App mounted');

    const containKey = (e: Event) => {
      if (nav.visible) e.stopPropagation();
    };
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      shadow.addEventListener(type, containKey);
    }

    // Capture phase, to beat the browser's own key handling on focused elements.
    document.addEventListener('keydown', handleKeyDown, true);
    console.log('[SuperTab] Escape listener attached');
  } catch (err) {
    console.error('[SuperTab] Init failed:', err);
  }
}

// Toggle intent from the background; the page owns the state and decides open-vs-close.
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isPaletteCommand(message) || message.name !== TOGGLE_PALETTE) return;
  if (nav.visible) {
    nav.close();
  } else {
    nav.open(searchCommand);
  }
});

// While open, Escape steps back: an open popover first, then one view; past root closes.
function handleKeyDown(e: KeyboardEvent): void {
  if (nav.visible && e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    nav.escape();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
