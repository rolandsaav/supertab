import App from './App.svelte';
import { visible, tabs } from './store.js';
import { get } from 'svelte/store';

const HOST_ID = 'supertab-host';

function init() {
  if (document.getElementById(HOST_ID)) return;

  // 1. Create an isolated host node
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

  // 2. Attach an open Shadow Root
  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Custom style injector – intercept Svelte runtime <style> appends
  //    and redirect them into the Shadow Root so the scoped CSS is not
  //    discarded by the browser's encapsulation boundary.
  const originalAppendChild = document.head.appendChild.bind(document.head);
  document.head.appendChild = function (node) {
    if (
      node instanceof HTMLStyleElement &&
      typeof node.id === 'string' &&
      node.id.startsWith('svelte-')
    ) {
      return shadow.appendChild(node);
    }
    return originalAppendChild(node);
  };

  // 4. Mount the Svelte app directly into the shadow root
  new App({ target: shadow });

  // 5. Global hotkey listeners
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
  const isCtrlSpace = e.ctrlKey && e.code === 'Space';

  if (!isCmdK && !isCtrlSpace) return;

  e.preventDefault();
  e.stopPropagation();

  const currentlyVisible = get(visible);

  if (!currentlyVisible) {
    // Request tab list from background service worker
    chrome.runtime.sendMessage({ type: 'GET_TABS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SuperTab]', chrome.runtime.lastError.message);
        return;
      }
      if (response?.tabs) {
        tabs.set(response.tabs);
      }
    });
  }

  visible.update((v) => !v);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
