import { mountApp } from './mount';
import { store } from '../ui/stores.svelte';

const HOST_ID = 'supertab-host';

/** Key (with Cmd or Ctrl) that opens the palette. */
const OPEN_KEY = 'k';

console.log('[SuperTab] Content script loaded');

function init(): void {
  console.log('[SuperTab] init() called, body exists:', !!document.body);
  if (document.getElementById(HOST_ID)) {
    console.log('[SuperTab] Host already exists');
    return;
  }

  try {
    // 1. Create isolated host node
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

    // 2. Attach open Shadow Root
    const shadow = host.attachShadow({ mode: 'open' });
    console.log('[SuperTab] Shadow root attached');

    // 3. Mount Svelte app (styles are injected into the shadow root by mountApp)
    mountApp(shadow);
    console.log('[SuperTab] App mounted');

    // 4. Global hotkey listener — capture phase so we intercept before
    //    the browser handles keys on focused elements (e.g. Escape on input).
    document.addEventListener('keydown', handleKeyDown, true);
    console.log('[SuperTab] Hotkey listener attached');
  } catch (err) {
    console.error('[SuperTab] Init failed:', err);
  }
}

// Toggle palette visibility on hotkey.
function handleKeyDown(e: KeyboardEvent): void {
  // Palette is open: Escape closes it.
  if (store.visible) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      store.close();
    }
    return;
  }

  // Palette is closed: Cmd/Ctrl+<OPEN_KEY> opens it.
  const isOpenHotkey = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === OPEN_KEY;
  if (isOpenHotkey) {
    e.preventDefault();
    e.stopPropagation();
    store.open();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
