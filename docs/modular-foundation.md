# Modular Foundation

**Status:** Design — in progress
**Branch:** `modular-foundation`

## Goal

Today the palette *is* the search. We want to make search one module among many,
Raycast-style. The palette becomes a shell that hosts interchangeable **modules**;
search is the first, and future modules (unload tabs, search downloads, tab groups,
manage extensions, …) plug into the same foundation.

This first step ships the **foundation** plus a **migration of the existing search**
into a module. No new feature modules yet.

### Target UX

- The base view is a **root command list** (Raycast-style): open the palette and you
  land on a filterable list of commands. Search is one command among them.
- The entry point is **programmable**: the palette can open to the root list, or open
  straight into a specific module, so different hotkeys can open different modes.

## Design patterns

We name things in the code to reflect the patterns deliberately.

| Pattern | Where | Role |
|---|---|---|
| **Command** | `Command<T>` — every invocable thing, root entries *and* per-item actions | Encapsulate a request (open a view, or perform an effect), optionally bound to a subject. |
| **Strategy** | `View` (the swappable module component the shell renders) | The shell holds the active view and delegates rendering to it; hotkeys select which one is live. |
| **Bridge** | shell ↔ module split; also the `ops` interface across the IPC seam | Abstraction and implementation vary independently. |
| **Composite** | root command list is itself a module/view; the nav stack is a path through a tree of views | The root is treated like any other view. |
| **Proxy** | `defineProxy` / a module's `ops` object in the content context | A remote stand-in that turns method calls into IPC to the background. |
| **Facade / Mediator** | the background dispatcher | Routes generic RPC envelopes to per-module handler maps. |

Note: Strategy and Bridge are the same shell↔module split viewed behaviorally vs
structurally. They coincide here because the implementation we swap *is* the behavior.

## Architecture

```
src/
  shell/
    Shell.svelte          # (was App.svelte) overlay + popup + footer; renders the active view
    nav.svelte.ts         # navigation store: visible, stack, open()/push()/pop()/close()
    view.ts               # the View (Strategy) type
    RootList.svelte       # the root command list — itself a module/view
  commands/
    command.ts            # the Command<T> contract (root entries AND per-item actions)
    registry.ts           # the root command list: [Search, …later modules] — the one wiring point
  modules/
    search/               # the migrated search module
      commands.ts         # every Command this module defines (launch command + per-item actions) ─┐
      Search.svelte       # the View (Strategy)                                                     │ content context
      api.ts              # the module's privileged interface + its content-side Proxy             ─┘
      background.ts       # implements api.ts + owns bg state (the search cache) ── background context
  components/
    ListView.svelte       # generic "searchable list + per-item actions" primitive (optional)
    Footer, Key, …        # shared chrome
  bridge/
    rpc.ts                # shared envelope types + content-side defineProxy (Proxy)
    rpc-background.ts     # background dispatcher + registerModule (Facade/Mediator)
```

### Three core abstractions

**1. `Command<T>` — the Command pattern, unified.** *Everything* invocable is a Command:
root entries (open a view / perform a one-shot) and the per-item actions inside a module
(activate, close, copy URL, …). The only difference between them is the **subject** — a
root command acts on nothing (`T = void`); an item action acts on the highlighted item
(`Command<TabItem>`). So an action is just a command bound to a subject.

```ts
// src/commands/command.ts
import type { Component } from 'svelte';
import type { View } from '../shell/view';

/**
 * Command pattern: anything invocable in the palette. Bundles how it presents
 * (title/icon/keywords/shortcut) with what it does (`run`), optionally bound to a
 * subject T — void for root commands, e.g. TabItem for per-item actions.
 */
export interface Command<T = void> {
  id: string;
  title: string;
  icon: Component;
  keywords?: string[];
  shortcut?: Shortcut;                 // for invoking from a view's action panel
  run: CommandRun<T>;
}

export type CommandRun<T> =
  | { kind: 'view'; view: View }                                          // push a view — go deeper
  | { kind: 'perform'; perform: (subject: T) => Promise<void>; after?: 'close' | 'stay' };
```

The `view | perform` discriminant lets the shell stay smart without knowing specifics: a
`view` command pushes (never closes); a `perform` command respects `after` (default
`'close'`). This collapses the old `primaryAction`/`actionsFor` into one convention: **a
view's item-commands are a list; `[0]` is the primary (Enter) action, the rest fill the
action panel, and any can carry a `shortcut`.** One type, one mental model.

Raycast keeps root Commands and in-view Actions as separate concepts; we unify because our
only real axis of difference is the subject, which the generic captures cleanly.

**2. `View` — the Strategy the shell renders.** A View is *just* a Svelte component —
the whole module contract. No required props; it reaches navigation and the footer
through shell context, so any component conforms with zero boilerplate (a non-list
module owes nothing to ListView).

```ts
// src/shell/view.ts
import type { Component } from 'svelte';
export type View = Component;
```

**3. `Nav` — the stack, with root-as-a-module.**

```ts
// src/shell/nav.svelte.ts
interface Frame { view: View; title: string; }   // a stack entry
const ROOT: Frame = { view: RootList, title: 'SuperTab' };  // not a registry entry

class Nav {
  visible = $state(false);
  stack = $state<Frame[]>([ROOT]);

  get current(): Frame { return this.stack.at(-1)!; }
  get canPop(): boolean { return this.stack.length > 1; }

  // No target → root list. A command id → open straight into that module, root left
  // underneath so Escape backs out to it — unless keepRoot:false, where the module
  // becomes the whole stack and Escape closes.
  open(target?: string, { keepRoot = true } = {}): void { /* seed stack, then push target */ }
  push(command: Command): void { /* view → push a Frame; action → perform + close */ }
  pop(): void { this.canPop ? this.stack = this.stack.slice(0, -1) : this.close(); }
  close(): void { this.visible = false; }
}

export const nav = new Nav();
```

## Decisions

1. **Programmable open with root underneath (D1).** `open()` seeds the stack. Opening
   straight into a module leaves root beneath it, so Escape backs out to root — unless
   `keepRoot: false`, where the module is the whole stack and Escape closes. **F1 opens
   straight into search** (`open('search')`), keeping today's zero-friction entry; the
   root list is one Escape away rather than in the path every time.
2. **Module state lives inside its Svelte component (D2).** Push = mount, pop = unmount,
   so lifecycle is free — including search's "refresh the background cache on entry",
   which fires in the module's `onMount` instead of today's `store.open()`. The old
   singleton `PaletteStore` shrinks to the shell nav store.
3. **Per-item actions fold into ListView (D3).** The shell stops tracking a search-specific
   `mode`/`actionId`. Consequence: the **footer is view-driven** — the shell exposes a
   footer slot (via context) that the active view populates; the shell owns no action
   knowledge. ListView fills it from the highlighted item's actions.
4. **ListView is optional, not the contract.** The module contract is "a View (a Svelte
   component)". ListView is a reusable primitive *below* that layer for the common
   list-shaped case. Non-list modules (forms, dashboards, …) render whatever they want.
5. **Root is a special `Frame`, not a registry `Command`** — otherwise root would list
   itself. The registry is *what root renders*, not root itself.
6. **A "module" is a convention, not a type** — a folder that exports its `Command` and
   view. `registry.ts` is the single composition point. Leverage comes from `Command` +
   `View`; there is no `Module` interface to implement.
7. **Views reach `nav`/footer via Svelte context, not props** — keeps the `View` contract
   prop-free and sidesteps the `nav → RootList → nav` import cycle (RootList reads nav
   from context at runtime).
8. **One unified `Command<T>` type — no separate `Action`.** Root entries and per-item
   actions are the same type, differing only by subject `T`. A view's item-commands are a
   list; `[0]` is primary (Enter), the rest fill the action panel. Replaces
   `primaryAction`/`actionsFor`.
9. **Module folder is four obvious files** — `commands.ts` (all Command definitions),
   `<Name>.svelte` (the View), `api.ts` (privileged interface + Proxy), `background.ts`
   (implements `api.ts`). `api ⇄ background` is the client/implementation pair.
10. **`src/ui` → `src/components`.**
11. **Back navigation chrome.** When the palette is in a pushed view (`nav.canPop`),
    ListView shows a back button left of the input. Clicking it and pressing Escape both
    call `nav.pop()` — one frame back, landing on root today. Mirrors Raycast's back arrow.
12. **Hand-rolled RPC, no dependency.** Evaluated `@webext-core/messaging`, `comlink` +
    `comlink-extension`, `webext-bridge`, and `trpc-chrome`. The whole layer is ~30 lines,
    the per-module self-registration is a design centerpiece few libs express cleanly, and
    it keeps zero deps in a content script that ships on every page. One-shot `sendMessage`
    (what we and `@webext-core` use) is MV3-safe; Comlink's persistent ports are not.
    `@webext-core/messaging` is the fallback if maintaining our own ever chafes.
13. **Proxy over explicit wrappers for the client.** `defineProxy<T>` casts once and every
    method inherits its signature from the interface; explicit `call<Ret>(…)` wrappers would
    restate each return type (boilerplate that can drift). The metaprogramming is contained
    in one ~6-line helper module authors never open.

## Actions vs. operations (the IPC boundary)

"Runs in the background" is a property of an **operation**, not a command. A command's
`perform` always executes in the content context (where the palette lives); it *calls
into* privileged operations when it needs them. The boundary sits at the operation, not
the command — e.g. "Close Tab" needs the background (`tabs.remove`) *then* a content-side
toast; "Copy URL" is content-only. So a `perform` freely composes local calls + privileged
ops.

The module's `api` interface is the single source of truth and *is* the Bridge seam
between the two contexts. Content gets a **Proxy** that turns method calls into IPC;
background *implements* the same interface. Both halves are shown in full under
[Anatomy of a module](#anatomy-of-a-module).

`api.ts` imports only the *type* of the interface (`import type`), so all the
`browser.*`/cache code stays out of the content bundle.

### RPC lifecycle

- **Proxy** (content): created once when the module loads — an inert, stateless
  letter-writer. It holds no connection, so it survives across background restarts and
  never needs to reconnect.
- **Handlers** (background): `registerModule` runs as a top-level import side effect, so
  the registry is (re)built every time the service worker boots — including after MV3
  kills it for idleness. The browser fully evaluates the worker before delivering a
  message, so registration always wins the race against the first call.
- **A call**: the proxy formats an envelope → `sendMessage` → the dispatcher looks up
  `REGISTRY[module][op]` → runs the handler → replies. Using one-shot `sendMessage`
  (not a persistent port) is what keeps this MV3-safe.

### Generic machinery (replaces the `Request` union + `handle` switch)

```ts
// bridge/rpc.ts  (shared) — content-side Proxy factory
export interface RpcRequest { module: string; op: string; args: unknown[]; }
export type RpcResponse = { ok: true; value: unknown } | { ok: false; error: string };

export function defineProxy<T extends object>(module: string): T {
  return new Proxy({} as T, {
    get: (_t, op: string) => (...args: unknown[]) => call({ module, op, args })
  });
}
```

```ts
// bridge/rpc-background.ts — the dispatcher (Facade/Mediator)
const REGISTRY: Record<string, Record<string, (...a: any[]) => Promise<unknown>>> = {};
export function registerModule(name: string, handlers: object) { REGISTRY[name] = handlers as any; }

browser.runtime.onMessage.addListener(async (msg: RpcRequest): Promise<RpcResponse> => {
  const fn = REGISTRY[msg.module]?.[msg.op];
  if (!fn) return { ok: false, error: `Unknown op ${msg.module}.${msg.op}` };
  try { return { ok: true, value: await fn(...msg.args) }; }
  catch (e) { return { ok: false, error: String(e) }; }
});
```

`background/background.ts` collapses to: `import` each module's `background.ts` for its
side-effect registration, plus the truly global lifecycle bits (the visited-set
`onStartup`/`onActivated`/`onRemoved` listeners). The monolithic switch is gone; each
module owns its own handlers *and* its own background state.

### Deferred: shared tab ops

Tab verbs (`activate`, `close`, `duplicate`) are search's ops for now. When a second
consumer appears (Unload Tabs, Tab Groups), extract a shared `tabs` ops namespace
(rule of three). We do **not** build shared infrastructure speculatively.

## ListView

The generic "searchable list + per-item actions" primitive that backs most modules
(root list, search, and future list-shaped modules). It is **optional** — non-list
modules render their own view and never touch it.

```ts
// components/ListView.svelte  <script lang="ts" generics="T">
interface Props {
  items: T[];
  getId: (item: T) => string;
  placeholder: string;
  commands: (item: T) => Command<T>[];   // per-item; [0] = primary (Enter), rest = action panel
  item: Snippet<[T]>;                    // row renderer — the module owns row markup
  header?: Snippet;                      // optional chrome, e.g. search's source-toggle icons
  isLoading?: boolean;
  onQuery?: (query: string) => void;     // present → controlled; absent → internal fuzzy filter
  onRefresh?: () => void;                // called after a `perform` command with after: 'stay'
}
```

ListView owns the generic machinery: the `Command.Root` + input + list, keyboard nav,
a **back button** left of the input (shown when `nav.canPop`; click = Escape = `nav.pop()`),
the **actions panel** overlay (right-click / shortcut), running commands, and populating
the **footer** from the highlighted item's primary command. Modules supply only data +
row markup.

### Decision A — who filters

One signal flips the mode:

- **`onQuery` provided → controlled.** ListView renders `items` as-is and reports each
  keystroke; the module re-fetches and hands back new `items` (search queries the
  background, debounced, with `reqId` to drop stale responses).
- **`onQuery` absent → internal filter.** ListView filters `items` itself with our uFuzzy
  ranking helper. The root list and any small in-memory list get fuzzy search for free.

### Decision B — who runs a command

ListView handles the generic path so no module reimplements it:

- `view` command → `nav.push`.
- `perform` + `after: 'close'` → perform, then `nav.close()`.
- `perform` + `after: 'stay'` → perform, then `onRefresh?.()` (refreshing is
  module-specific: search re-runs prepare+query; root re-filters, so it omits `onRefresh`).

## Anatomy of a module

The full search module — four files, the shape every future module copies. A module
author writes these four files and adds one line to `registry.ts` (`searchCommand`);
they never touch `bridge/`, `shell/`, or the registry internals.

The four files map to four questions: how it appears (`commands.ts`), what it looks like
(`<Name>.svelte`), what it can do in the background (`api.ts` — the contract), and how it
does it (`background.ts`).

**`modules/search/api.ts`** — the contract + the client (content side):

```ts
import type { Item, SourceToggles } from '../../search/parsers';
import { defineProxy } from '../../bridge/rpc';

/** Privileged operations the search module runs in the background. */
export interface SearchApi {
  prepare(): Promise<void>;
  query(q: string, enabled: SourceToggles, reqId: number): Promise<{ reqId: number; items: Item[] }>;
  activateTab(id: string): Promise<void>;
  closeTab(id: string): Promise<void>;
  duplicateTab(id: string): Promise<void>;
  openUrl(url: string): Promise<void>;
}

export const searchApi = defineProxy<SearchApi>('search');
```

**`modules/search/background.ts`** — implements the contract + owns background state:

```ts
import browser from 'webextension-polyfill';
import { registerModule } from '../../bridge/rpc-background';
import { SOURCES } from '../../search/sources';
import { search, type SearchPool } from '../../search/search';
import type { Kind, SourceToggles } from '../../search/parsers';
import type { SearchApi } from './api';

let cache: SearchPool = {};   // the search cache now lives with the module, not in background.ts

async function fillPool(enabled: SourceToggles): Promise<void> {
  const missing = (Object.keys(enabled) as Kind[]).filter(
    (k) => enabled[k] && SOURCES[k] && cache[k] === undefined
  );
  await Promise.all(missing.map(async (k) => { cache[k] = await SOURCES[k]!.fetch(); }));
}

// Duplicate without leaving the copy focused, so the palette stays put.
async function duplicateTab(id: string): Promise<void> {
  const [active] = await browser.tabs.query({ currentWindow: true, active: true });
  await browser.tabs.duplicate(Number(id));
  if (active?.id != null) await browser.tabs.update(active.id, { active: true });
}

const handlers: SearchApi = {
  async prepare() { cache = {}; },
  async query(q, enabled, reqId) {
    await fillPool(enabled);
    return { reqId, items: search(cache, enabled, q) };
  },
  async activateTab(id) { await browser.tabs.update(Number(id), { active: true }); },
  async closeTab(id) { await browser.tabs.remove(Number(id)); },
  duplicateTab,
  async openUrl(url) { await browser.tabs.create({ url }); }
};

registerModule('search', handlers);
```

**`modules/search/commands.ts`** — the launch command + per-item actions (all `Command`s):

```ts
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import X from '@lucide/svelte/icons/x';
import Link from '@lucide/svelte/icons/link';
import Copy from '@lucide/svelte/icons/copy';
import SearchIcon from '@lucide/svelte/icons/search';
import type { Command } from '../../commands/command';
import type { Item } from '../../search/parsers';
import { searchApi } from './api';
import Search from './Search.svelte';

/** Root-list entry: opens the search view. */
export const searchCommand: Command = {
  id: 'search',
  title: 'Search Tabs, Bookmarks & History',
  icon: SearchIcon,
  keywords: ['tabs', 'bookmarks', 'history', 'find'],
  run: { kind: 'view', view: Search }
};

// Content-side only — no background needed, so no api call.
const copyUrl: Command<Item> = {
  id: 'copy-url', title: 'Copy URL', icon: Link, shortcut: { mod: true, key: 'c' },
  run: { kind: 'perform', perform: (item) => navigator.clipboard.writeText(item.url), after: 'stay' }
};

const openInNewTab: Command<Item> = {
  id: 'open', title: 'Open in New Tab', icon: ArrowRight,
  run: { kind: 'perform', perform: (item) => searchApi.openUrl(item.url), after: 'close' }
};

/** Commands for a result — [0] is the primary (Enter) action, the rest fill the panel. */
export function commandsForItem(item: Item): Command<Item>[] {
  switch (item.kind) {
    case 'tab':
      return [
        { id: 'activate', title: 'Activate', icon: ArrowRight,
          run: { kind: 'perform', perform: (i) => searchApi.activateTab(i.id), after: 'close' } },
        { id: 'close', title: 'Close Tab', icon: X, shortcut: { mod: true, key: 'Backspace' },
          run: { kind: 'perform', perform: (i) => searchApi.closeTab(i.id), after: 'stay' } },
        copyUrl,
        { id: 'duplicate', title: 'Duplicate Tab', icon: Copy,
          run: { kind: 'perform', perform: (i) => searchApi.duplicateTab(i.id), after: 'stay' } }
      ];
    case 'bookmark':
    case 'history':
      return [openInNewTab, copyUrl];
  }
}
```

**`modules/search/Search.svelte`** — the view, wiring data to ListView:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import ListView from '../../components/ListView.svelte';
  import { searchApi } from './api';
  import { commandsForItem } from './commands';
  import type { Item, SourceToggles } from '../../search/parsers';

  let items = $state<Item[]>([]);
  let enabled = $state<SourceToggles>({ tab: true, bookmark: false, history: false });
  let lastQuery = $state('');
  let reqSeq = 0;

  onMount(() => { void searchApi.prepare(); });   // refresh the bg cache on entry (was store.open())

  async function runQuery(q: string) {
    lastQuery = q;
    const id = ++reqSeq;
    const clean = $state.snapshot(enabled);        // snapshot before it crosses IPC, or clone throws
    const { reqId, items: next } = await searchApi.query(q, clean, id);
    if (reqId === reqSeq) items = next;            // drop stale responses
  }
</script>

<ListView
  {items}
  getId={(i) => i.id}
  placeholder="Search tabs, bookmarks & history…"
  commands={commandsForItem}
  onQuery={runQuery}
  onRefresh={() => runQuery(lastQuery)}
>
  {#snippet item(i)}
    <!-- favicon + title + url row markup -->
  {/snippet}
</ListView>
```

Notice the **actions-vs-operations boundary is visible in one file**: in `commands.ts`,
`copyUrl` calls `navigator.clipboard` directly (content-side), while `close`/`activate`/
`openUrl` call `searchApi.*` (over IPC). Same `Command` type — the boundary is just
whether the `perform` reaches for the api.

Migrating search this way retires `bridge/messages.ts`, `bridge/background-bridge.ts`, and
the `handle` switch in `background.ts`, along with the old singleton `PaletteStore`.

## Compared to Raycast

We checked the design against Raycast (terminology, file structure, command lifecycle).
We track its proven model closely; the divergences are deliberate.

**Aligned:**
- Raycast **Command** (entry point in root search) → our `Command` + `RootList`.
- Raycast **view command** (renders a component, stays loaded until you go back to root)
  → our `{ kind: 'view' }` frame on the nav stack.
- Raycast **no-view command** (`mode: no-view`: run async, show a HUD, unload) → our
  `{ kind: 'perform', after: 'close' }`. Their `mode` field *is* our `run.kind`.
- Raycast root search fuzzy-matches all commands → `RootList` with internal uFuzzy filter.

That Raycast independently lands on the same view/no-view split is good evidence the core
abstraction is right.

**Deliberate divergences:**
1. **Code registry, not a manifest.** Raycast declares commands in `package.json` so a
   *store* can list/search them without loading code. We're one self-authored compiled
   extension; a code `registry.ts` is simpler and loses nothing.
2. **We unify `Command` + `Action`; Raycast separates them.** Raycast's Actions already
   span push-a-view (`<Action.Push>`) and run-a-fn (`onAction`) — the same duality as our
   `run`. Their Command/Action line exists to serve the manifest (entry points must be
   statically declared; in-panel actions needn't). Without a manifest that boundary loses
   its reason, so one `Command<T>` is simpler.
3. **Modules are folders, not one file per command.** The extra `api.ts`/`background.ts`
   exist only because MV3 forces a content/background IPC split that Raycast doesn't have.

**Considered and declined:** lazy-loading module views (Raycast's metadata-vs-implementation
split). Valuable at store scale, but true dynamic import in an injected content script is an
MV3 wrinkle (single-IIFE bundle, `web_accessible_resources`). With a handful of modules it
won't threaten the <150 ms open target, so **views load eagerly (`view: Component`) and we
do not build a lazy seam** until bundle size actually bites.

**Borrowing:**
- **Back navigation chrome** — Raycast's back arrow left of the search bar (decision 11).
- *(Later, optional)* a small library of `Command` factories for common verbs (copy URL,
  open in new tab), echoing Raycast's `<Action.*>`.
```
