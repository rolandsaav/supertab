# Super Tab MVP — Technical Specification

**Version:** 1.0  
**Date:** 2026-05-23  
**Status:** Draft  

---

## Context & Scope

### Document Objective

Super Tab is a browser extension that replaces traditional tab-bar-driven navigation with a hotkey-triggered command palette. The MVP must be daily-driveable: it should feel faster and less obtrusive than Sideberry while supporting fuzzy search across tabs, history, and bookmarks with a keyboard-first workflow.

### Proposed Solution

A **Manifest V3 browser extension** with three layers:

1. **Background Service Worker** — proxies access to privileged APIs (`chrome.tabs`, `chrome.history`, `chrome.bookmarks`) and returns structured tab/history/bookmark data to content scripts.
2. **Content Script** — injects a zero-size Shadow DOM host into every page, mounts a Svelte app inside it, and intercepts Svelte runtime `<style>` appends so scoped CSS lives inside the Shadow Root (zero FOUC).
3. **Svelte UI (Bits UI `Command`)** — renders the modal palette with fuzzy search, keyboard navigation, and mode-switching (tabs / history / bookmarks).

### Non-Goals

| # | Out of scope for MVP |
|---|----------------------|
| 1 | Tab closing / management actions (close, mute, pin, duplicate) |
| 2 | Persistent user settings or state (themes, keybindings, recent selections) |
| 3 | Tab groups, tagging, split-view support |
| 4 | Custom search-prefix redirects ("books → annas archive") |
| 5 | Tab unloader integration |
| 6 | Extensions management panel |
| 7 | Settings/options page |
| 8 | Accessibility audit beyond basic keyboard navigation |
| 9 | Telemetry or analytics |

### Success Metrics

1. **Daily usage:** Author uses Super Tab as primary tab-navigation tool and stops using Sideberry.
2. **Performance:** Palette opens in < 150 ms from hotkey press on a page with 50+ tabs.
3. **Search quality:** Fuzzy ranking surfaces the intended result in the top 3 for > 90% of common queries.
4. **Cross-browser:** Identical feature set and behavior in Chrome and Firefox with a single build.

---

## Technical Architecture & Rationale

### Current State

A working prototype exists at `prototypes/fundamental-poc/` with the following proven architecture:

- Vite + Svelte build pipeline producing a single IIFE content-script bundle.
- `css: 'injected'` so Svelte CSS is embedded in JS and appended at runtime.
- `document.head.appendChild` interceptor that redirects Svelte `<style id="svelte-…">` nodes into the Shadow Root.
- Background service worker responding to `GET_TABS` messages.
- Simple Svelte 5 runes (`$state`, `$derived`) for reactive UI state and a hand-rolled modal.

**Prototype limitations that the MVP resolves:**
- No fuzzy search (naïve `String.includes`).
- No keyboard navigation (mouse-only).
- Only tabs; no history or bookmarks.
- No recently-used ordering.
- No cross-browser build abstraction.

### New State

```
supertab/
├── src/
│   ├── content/                 # Content-script entry & bootstrap
│   │   ├── content.js           # Shadow host setup, style interceptor, hotkey handler
│   │   └── mount.js             # Svelte app mount into shadow root
│   ├── ui/
│   │   ├── App.svelte           # Root component: orchestrates store + mode + overlay
│   │   ├── CommandPalette.svelte # Bits UI Command wrapper + search input
│   │   ├── ResultList.svelte    # Virtual or plain scrollable list of Command.Item
│   │   ├── ModeIndicator.svelte # Shows current mode (Tabs / History / Bookmarks)
│   │   └── stores.js            # Svelte 5 state: visible, query, mode, results, selectedIndex
│   ├── search/
│   │   ├── fuse-index.js        # Fuse.js index creation & search orchestration
│   │   └── parsers.js           # Normalize chrome.tabs / history / bookmarks → uniform Item[]
│   ├── bridge/
│   │   └── background-bridge.js # Typed wrapper around chrome.runtime.sendMessage
│   └── background/
│       └── background.js        # Service worker: message router + API proxies
├── public/
│   ├── manifest-chrome.json     # MV3 manifest for Chromium
│   └── manifest-firefox.json    # MV3 manifest for Firefox (uses `background.scripts` event page)
├── vite.config.js               # Single build target; manifest copied per browser
├── svelte.config.js
└── package.json
```

### Component Breakdown

| File | Role | Added / Modified |
|------|------|-----------------|
| `src/content/content.js` | Shadow host creation, `appendChild` interceptor, global hotkey listener (`Cmd+K`, `Ctrl+K`, `Ctrl+Space`, `Esc`). | Modified |
| `src/content/mount.js` | Imports Svelte app, mounts into `shadowRoot`. Keeps mount logic separate from DOM plumbing. | Added |
| `src/ui/App.svelte` | Top-level orchestrator. Reacts to `visible` state, fetches data on open, handles `Escape` close. Uses Svelte 5 runes. | Added |
| `src/ui/CommandPalette.svelte` | Wraps Bits UI `Command.Root`, `Command.Input`, `Command.List`, `Command.Item`. Wires fuzzy search results into the list. Svelte 5 event bindings (`onclick`, `onkeydown`). | Added |
| `src/ui/ResultList.svelte` | Renders `Command.Item` rows with title + URL + favicon placeholder. Handles hover/keyboard selection styling. | Added |
| `src/ui/ModeIndicator.svelte` | Small badge showing active mode. Switches on `h:` / `b:` / default prefix in query. | Added |
| `src/ui/stores.js` | Svelte 5 runes-based state module exporting reactive state and derived values (e.g., `results` from `query + mode + rawData`). | Added |
| `src/search/fuse-index.js` | Creates a `Fuse` index per data source with keys `['title', 'url']`. Re-ranks on query change. | Added |
| `src/search/parsers.js` | Normalizes `chrome.tabs.Tab`, `chrome.history.HistoryItem`, `chrome.bookmarks.BookmarkTreeNode` into a uniform `{ id, type, title, url, lastAccessed }` shape. | Added |
| `src/bridge/background-bridge.js` | Promise-wrapper around `chrome.runtime.sendMessage`. Encodes message types for TypeScript-like safety. | Added |
| `src/background/background.js` | Message router. Routes `GET_TABS`, `GET_HISTORY`, `GET_BOOKMARKS` to respective `chrome.*` APIs. Returns uniform arrays. | Modified |
| `public/manifest-*.json` | Chrome (MV3 service_worker) and Firefox (MV3 background.scripts) manifests with correct permissions. | Modified |
| `vite.config.js` | Builds content script as IIFE. Copies correct manifest at build time via env flag or separate script. | Modified |

### Architectural Decisions

#### 1. Svelte 5 + Vite
**Rationale:** Svelte 5 offers fine-grained reactivity via runes (`$state`, `$derived`, `$effect`), eliminating the need for the `svelte/store` API and making reactive logic more explicit and performant. It is the current stable release and the direction of the ecosystem.  
**Trade-off:** Svelte 5's style injection mechanism may differ from Svelte 4's `css: 'injected'` behavior. The Shadow DOM interceptor must be validated during implementation. Bits UI must be on a version compatible with Svelte 5 (use `bits-ui@next` or latest).  
**Migration note:** All reactive state moves from `writable`/`derived` stores to runes. Event handlers use `onclick` instead of `on:click`. Lifecycle uses `$effect` instead of `onMount` where appropriate.

#### 2. Shadow DOM + `appendChild` Interceptor (retained from prototype)
**Rationale:** Achieves full style isolation from host pages with zero additional build tooling. No FOUC observed in prototype.  
**Trade-off:** Relies on a runtime monkey-patch of `document.head.appendChild`. Svelte 5 may inject styles differently than Svelte 4 (e.g., via `adoptedStyleSheets` or different timing). Mitigation: validate interceptor during Svelte 5 integration; fall back to build-time CSS string extraction if the interceptor fails. Add a CI test that asserts styles are present inside `#shadow-root` after mount.  
**Alternative considered:** Build-time extraction of CSS into a string and manual `<style>` injection. Rejected for MVP to avoid custom Rollup plugins; re-evaluate if interceptor breaks.

#### 3. Bits UI `Command` Component
**Rationale:** Provides accessible, keyboard-navigable list primitives (↓↑, Enter, Escape) out of the box. Aligns with "keyboard-first" requirement.  
**Trade-off:** Adds a dependency. Bits UI is headless, so styling remains fully custom.  
**Alternative considered:** Hand-rolled keyboard navigation. Rejected: reinvents accessibility and focus management.

#### 4. Fuse.js for Fuzzy Search
**Rationale:** Mature, zero-config fuzzy search with configurable keys and threshold. Works in browser with no build headaches.  
**Trade-off:** Not the fastest library for 10k+ history items. For MVP history/bookmark volume, performance is acceptable.  
**Alternative considered:** `fast-fuzzy`, `fuzzysort`. Rejected: Fuse.js has better API for multi-key searching and ranking customization.

#### 5. No Persistence Layer
**Rationale:** MVP is ephemeral. "Recently used" ordering is derived from `chrome.tabs` / `chrome.history` `lastAccessedTime`, not a local cache.  
**Trade-off:** Cannot learn user habits beyond what the browser APIs expose. Acceptable for MVP.

#### 6. Cross-Browser via Dual Manifests + Build Flag
**Rationale:** Chrome and Firefox both use MV3, but with incompatible background fields (`service_worker` vs `background.scripts`). A build-time flag copies the correct manifest.  
**Trade-off:** Two manifests to maintain. For a small extension, this is simpler than a manifest generator.  
**Alternative considered:** `webextension-polyfill` + dynamic manifest generation. Rejected: adds complexity; can adopt later if manifest divergence grows.

#### 7. Background Service Worker as API Proxy
**Rationale:** Content scripts cannot access `chrome.history` or `chrome.bookmarks` directly. A message-passing proxy is the standard MV3 pattern.  
**Trade-off:** Async latency (~5–20 ms) per message. Negligible for human-scale interactions.

### Impact Analysis

| Dimension | Before (Prototype) | After (MVP) |
|-----------|-------------------|-------------|
| Search | Naïve `includes` | Fuse.js fuzzy ranking across title + URL |
| Navigation | Mouse-only click | Full keyboard (arrows / vim keys / Enter / Esc) via Bits UI |
| Data sources | Tabs only | Tabs + History + Bookmarks |
| Ordering | Unordered | Recently-used by default; search-score when query is non-empty |
| Mode switching | None | Prefix-based (`h:`, `b:`) + default tabs |
| Browser support | Chrome only | Chrome + Firefox |
| Close action | N/A (not implemented) | Explicitly out of scope |

---

## Data, Security & Compliance

### Security Model

- **No external network requests** except favicon images from `google.com/s2/favicons`. All tab/history/bookmark data comes from browser APIs (`chrome.tabs`, `chrome.history`, `chrome.bookmarks`).
- **No user secrets or API keys.** Nothing to leak.
- **Content script isolation:** Shadow DOM prevents host-page scripts from reading palette DOM or styles. The `open` shadow mode is used (not `closed`) because browser extension content scripts do not gain security from `closed` mode — host pages can still access the shadow root via `element.shadowRoot`.
- **Host permissions:** `<all_urls>` is required for the content script to inject on every page. This is standard for global hotkey extensions. The extension does not read page content beyond its own shadow host.
- **CSP:** The built content script is a single inline IIFE; no `eval` or remote scripts.

### Data Integrity

- **Input:** User query is a plain string. It is passed directly to Fuse.js; no server-side rendering or SQL injection risk.
- **Browser API responses:** Treated as untrusted in shape only. `parsers.js` normalizes and drops unexpected fields. Missing `title` or `url` falls back to `"Untitled"` / `""`.

### Security & Compliance

- **PII:** History and bookmarks are user data, but they never leave the browser. No telemetry or external logging.
- **Compliance:** Not applicable. No payments, no user accounts, no cloud storage.

---

## Operational Guardrails & Observability

### Observability & Monitoring

- **Console logging:** Background service worker logs API call errors to `console.error` with the `[SuperTab]` prefix.
- **No external APM:** Not justified for a personal-use MVP.
- **Runtime health check:** On mount, the Svelte app verifies the shadow root contains a `<style>` node. If absent, it logs a warning indicating the interceptor may have failed.

### Infrastructure Requirements

- None. Pure client-side browser extension. Build artifacts are static files served by the browser's extension store or unpacked loading.

### Startup & Runtime Validation

| Check | Failure mode |
|-------|-------------|
| `chrome.runtime` is defined | Log warning if running outside extension context (e.g., dev server) |
| Shadow host attaches successfully | Throw if `attachShadow` fails (should never happen) |
| Svelte 5 styles land in shadow root | Log warning if interceptor missed; palette may render unstyled |
| Background responds to `GET_TABS` within 2 s | If timeout, show empty state with "Could not load tabs" message |

### Risk Assessment & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Svelte 5 style-injection differs from Svelte 4 | Medium | High | Validate interceptor during integration; have fallback build-time CSS injection ready |
| Fuse.js performance degrades with large history | Medium | Medium | Cap history fetch to last 500 items; add debounce (150 ms) on query input |
| Firefox MV3 support lags / differs | Medium | Medium | Use MV3 with `background.scripts` (Firefox event page); test in Firefox Dev Edition |
| Bits UI `Command` API changes in major version | Low | Medium | Pin version; migration is localized to `CommandPalette.svelte` |
| Hotkey conflicts with host page or other extensions | Medium | Low | Use `preventDefault()` + `stopPropagation()`; document known conflicts |

---

## Verification & Testing

### Testing Strategy

| Layer | Approach |
|-------|----------|
| **Unit** | Test `parsers.js` normalization logic with mock chrome API objects. Test Fuse.js ranking with fixture data. |
| **Integration** | Mock `chrome.runtime.sendMessage` and verify background router dispatches to correct API. |
| **E2E (manual)** | Load unpacked extension in Chrome + Firefox. Verify hotkey opens palette, fuzzy search ranks correctly, Enter switches tab, Escape closes, mode prefixes work. |
| **Visual regression** | Not for MVP. Rely on Svelte scoped CSS + manual spot-checks. |

### Benchmarking

- **Open latency:** Use `performance.now()` in `handleKeyDown` → first render frame. Target < 150 ms.
- **Search latency:** Time from `input` event to sorted results array. Target < 50 ms for 200 items.
- **Memory:** Profile heap after opening palette 20 times; ensure no detached DOM nodes from Svelte components.

### CI/CD Integration

- GitHub Actions workflow:
  1. `npm ci` (installs Svelte 5, `bits-ui@next`, `@sveltejs/vite-plugin-svelte@^4`)
  2. `npm run build` (Chrome)
  3. `npm run build:firefox`
  4. Run unit tests with `vitest`
  5. Lint with `eslint` + `svelte-check`
  6. Artifact: `dist-chrome.zip`, `dist-firefox.zip`

---

## Execution & Deployment

### Implementation Order

1. **Scaffold** — Reorganize prototype files into `src/content/`, `src/ui/`, `src/search/`, `src/bridge/`, `src/background/`.
2. **Dependencies** — Add `bits-ui@next` (Svelte 5 compatible), `fuse.js`, `lucide-svelte`, `@sveltejs/vite-plugin-svelte@^4`. Update `vite.config.js` for alias resolution.
3. **Background Proxy** — Expand `background.js` to handle `GET_TABS`, `GET_HISTORY`, `GET_BOOKMARKS`. Add `parsers.js` normalization.
4. **Bridge Layer** — Write `background-bridge.js` with typed message wrappers.
5. **Search Core** — Implement `fuse-index.js`: create index, search, return ranked + recently-ordered results.
6. **UI Shell** — Replace prototype `App.svelte` with Bits UI `Command` structure. Build `CommandPalette.svelte`, `ResultList.svelte`, `ModeIndicator.svelte`.
7. **Mode Switching** — Parse query prefix in `stores.js` derived store. Wire mode change to background API call.
8. **Keyboard Navigation** — Ensure Bits UI arrow/vim/Enter/Escape handling works inside Shadow DOM.
9. **Recently-Used Ordering** — Default sort by `lastAccessedTime` descending when query is empty.
10. **Cross-Browser Build** — Finalize dual manifest setup. Test in Chrome and Firefox.
11. **Polish** — Loading states, empty states, error states, favicon display.
12. **Daily-Drive Test** — Install unpacked, use for one week, fix papercuts.

### Rollout & Rollback Plan

- **Rollout:** Load unpacked in primary browser. No store submission for MVP.
- **Rollback:** Remove extension from `chrome://extensions` or `about:addons`. No data loss risk (no persisted state).
- **Versioning:** Use semantic versioning in manifest. MVP = `1.0.0`.

---

## Collaborative Review

### Open Questions & FAQ

| # | Question | Status |
|---|----------|--------|
| 1 | What are the exact vim keybindings? `j/k` for ↓↑, `Ctrl+j/k`? Or just arrows + `j/k` when input is not focused? | **Resolved** — `j/k` navigate when search input is not focused. `Tab` / `Shift+Tab` also cycle through results. Arrows always work. |
| 2 | Should history mode show *all* history or a capped recent subset (e.g., last 30 days or 500 items)? | **Resolved** — Cap to 500 most-recent items. |
| 3 | Do bookmarks include folders, or only leaf URLs? | **Resolved** — Leaf URLs and their titles only. Folders are excluded. |
| 4 | Favicons: can we use `chrome://favicon/size/16@1x/<url>` or fetch from Google's service? | **Resolved** — Favicons are required. Use `https://www.google.com/s2/favicons?domain=<hostname>&sz=32` as a cross-browser fallback. Cache results in a `Map` to avoid repeated requests. |
| 5 | Should the palette remember the last query when reopened, or start fresh? | **Resolved** — Clear query and mode on every open. Fresh start. |

### Glossary

| Term | Definition |
|------|------------|
| **FOUC** | Flash of Unstyled Content — a brief moment where DOM is visible before CSS loads. |
| **MV3** | Manifest V3, the current Chrome extension format using service workers. |
| **Shadow DOM** | A browser API for encapsulating DOM subtrees and their styles from the host document. |
| **Bits UI** | A headless Svelte component library (successor to Melt UI) providing accessible primitives. |
| **Fuse.js** | A lightweight fuzzy-search library for JavaScript. |
| **IIFE** | Immediately Invoked Function Expression — the bundle format for content scripts to avoid polluting global scope. |
| **Sideberry** | A Firefox extension for vertical tab management; the tool Super Tab aims to replace. |
