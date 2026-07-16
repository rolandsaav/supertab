import { mountApp } from './mount';
import { nav } from '../shell/nav.svelte';
import { searchCommand } from '../modules/search/commands';

const HOST_ID = 'supertab-host';

/** Key that toggles the palette open/closed. */
const OPEN_KEY = 'F1';

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

    const containKey = (e: Event) => {
      if (nav.visible) e.stopPropagation();
    };
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      shadow.addEventListener(type, containKey);
    }

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
  // <OPEN_KEY> toggles the palette: open straight into search when closed, close when open.
  if (e.key === OPEN_KEY) {
    e.preventDefault();
    e.stopPropagation();
    if (nav.visible) {
      nav.close();
    } else {
      nav.open(searchCommand);
    }
    return;
  }

  // While open, Escape steps back: an open popover first, then one view; past root closes.
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
