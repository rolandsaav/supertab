# Super Tab – Shadow DOM Svelte Prototype

A high-performance browser extension prototype that proves **Svelte scoped CSS** can be reliably injected into a **Shadow DOM** without Flash-of-Unstyled-Content (FOUC) on the first hotkey press.

## Architecture Highlights

| Layer | Responsibility |
|---|---|
| **Vite + Svelte** | Builds the content script as a single IIFE bundle. CSS is inlined into JS (`css: 'injected'`) so it travels with the component. |
| **Custom Style Injector** | Intercepts Svelte runtime `<style id="svelte-…">` appends to `document.head` and redirects them into the **Shadow Root**, bypassing the browser's encapsulation boundary. |
| **Shadow DOM Host** | A zero-size fixed-position host node (`#supertab-host`) attaches an open shadow root. The Svelte app mounts directly inside it, achieving full DOM & style isolation from the host page. |
| **Background Service Worker** | Listens for `GET_TABS` messages and returns the current window's tab list via `chrome.tabs.query`. |

## Project Structure

```
supertab/
├── package.json
├── vite.config.js
├── svelte.config.js
├── src/
│   ├── content.js      # Content script entry – shadow host + style interceptor + hotkey handler
│   ├── store.js        # Svelte writable stores (visible, tabs, query)
│   └── App.svelte      # Modal search palette UI with scoped CSS
├── public/
│   ├── manifest.json   # MV3 manifest
│   └── background.js   # Service worker (plain JS, copied as-is to dist/)
└── dist/               # Build output – load this as an unpacked extension
```

## Installation & Build

```bash
# 1. Install dependencies
npm install

# 2. Build the extension
npm run build

# 3. Load in Chrome / Edge
#    - Open chrome://extensions
#    - Enable "Developer mode"
#    - Click "Load unpacked"
#    - Select the `dist/` folder
```

## Usage

| Action | Shortcut |
|---|---|
| Open / Close palette | `Cmd + K` (macOS) or `Ctrl + K` |
| Open / Close palette (alt) | `Ctrl + Space` |
| Close palette | `Escape` or click the dark overlay |

## Verification Criteria

1. Press the hotkey on **any** page – the popup appears immediately with **all styles applied** (no FOUC).
2. Open DevTools → Inspect the `<div id="supertab-host">` → observe the **`#shadow-root (open)`**.
3. Inside the shadow root you will see:
   - The rendered HTML (`<div class="st-overlay">…`)
   - A `<style id="svelte-…">` block containing the scoped CSS classes.
4. The scoped styles (custom Catppuccin-like dark theme, heavy box-shadow, Inter font stack) are **not** affected by the host page's CSS, and vice-versa.

## How the CSS Isolation Works

Svelte's default runtime behavior is to append scoped `<style>` tags to `document.head`. Because our component lives inside a Shadow Root, styles in the light DOM have no effect on shadow DOM nodes. We solve this by overriding `document.head.appendChild` in `src/content.js`:

```js
document.head.appendChild = function (node) {
  if (node instanceof HTMLStyleElement && node.id.startsWith('svelte-')) {
    return shadow.appendChild(node); // <-- physically inside shadow root
  }
  return originalAppendChild(node);
};
```

This is a zero-config, build-time-compatible solution that works with Svelte's `css: 'injected'` compiler option and requires no custom Rollup plugins.
