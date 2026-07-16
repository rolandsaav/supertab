# Modules — how they work & how to add one

**Audience:** anyone extending SuperTab with a new capability.
**Companion:** `docs/modular-foundation.md` explains _why_ the architecture is shaped
this way (the design and its decisions). This document is the _how-to_ — the concrete
steps, files, and wiring to add a module. When the two disagree, the code wins; tell us so
we can fix the doc.

## What a module is

A module is one capability in the palette — search, and later things like unload-tabs,
tab-groups, manage-extensions. It's a **convention, not a type**: a folder under
`src/modules/<name>/` that exports a launch `Command` and, if it has a UI, a `View`
(a Svelte component). There is no `Module` interface to implement. Leverage comes from two
shared abstractions:

- **`Command<T>`** (`src/commands/command.ts`) — anything invocable: a root-list entry that
  opens a view or performs a one-shot, _and_ the per-item actions inside a view. The only
  difference is the subject `T` (`void` for root commands, e.g. `Item` for an action on the
  highlighted row).
- **`View`** (`src/shell/view.ts`) — just a Svelte component (`type View = Component`). No
  required props; it reaches the shell through the `nav`/`footer`/`status` rune singletons.

Everything else in a module is the module's own business.

## The two contexts and the seam between them

A browser extension runs in two worlds, and a module can live in both:

- **Content context** — where the palette is mounted (a shadow root on every page). Views,
  commands, and any content-only effects (e.g. `navigator.clipboard`) run here.
- **Background context** — the MV3 service worker, the only place with privileged
  `browser.*` access (`tabs`, `bookmarks`, `history`, …).

The seam between them is the module's **`api` interface**. Content holds a **Proxy** that
turns method calls into IPC; background **implements** the same interface. This is the one
boundary you cross, and it's typed once:

```
content:    searchApi.query(...)   ──IPC──▶   background:  handlers.query(...)
            (defineProxy Proxy)                            (registerModule)
```

Two rules make the seam safe:

1. **`api.ts` imports only the _type_ of its shapes** (`import type { Item } from './parsers'`),
   so `browser.*`/cache code never leaks into the content bundle.
2. **Snapshot reactive values before they cross IPC** — `$state.snapshot(x)` — or the
   structured clone throws. See `Search.svelte`'s `runQuery`.

A `perform` always runs in the content context; it _calls into_ the api when it needs the
background. So "Copy URL" is content-only (no api call) while "Close Tab" calls
`searchApi.closeTab(...)`. The boundary is the operation, not the command.

## Anatomy — the search module as the reference

Every file below is optional except `commands.ts` (a module with no UI and no background is
just a launch command). `src/modules/search/` is the worked example:

| File             | Role                                                                                                                                        | Context    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `module.ts`      | the identity string `MODULE` — the RPC namespace _and_ the root-command id, in one place so the two halves can't drift                      | shared     |
| `commands.ts`    | the launch `Command` + the per-item `RowActions` (built with the `action()`/`openView()` factories)                                         | content    |
| `<Name>.svelte`  | the `View` — composes the list primitives, owns its own data pipeline                                                                       | content    |
| `api.ts`         | the privileged interface + `defineProxy<Api>(MODULE)` client                                                                                | content    |
| `background.ts`  | implements the interface, owns background state, calls `registerModule(MODULE, handlers)`                                                   | background |
| supporting files | row markup (`ItemRow.svelte`), domain logic (`search.ts`, `ranking.ts`, `parsers.ts`, `providers.ts`), presentation metadata (`sources.ts`) | as needed  |

The list primitives under `src/shell/list/` (`List`, `ListItem`, `context.ts`) are a
convenience for list-shaped views — they give you the input, keyboard nav, back button,
actions panel, and footer. **They are optional**: a non-list view (a form, a dashboard)
renders whatever it wants and owes them nothing.

## Adding a module — step by step

Pick the shape first:

- **A) One-shot command** (no UI, e.g. "Close all other tabs"): you need only a `perform`
  command. Skip the view.
- **B) List-shaped view** (like search): a view built on the list primitives.
- **C) Custom view**: any Svelte component; ignore the list primitives.

Then, for a module that needs the background:

### 1. Create the folder and identity

```
src/modules/<name>/
  module.ts     →  export const MODULE = '<name>';
```

`MODULE` must be unique across modules — it's the RPC namespace and the root-command id.

### 2. Define the api (only if it touches the background)

`api.ts` — the interface and the content-side client. Methods are async and take/return
plain serializable data (ids as strings, etc.):

```ts
import { defineProxy } from '../../bridge/rpc';
import { MODULE } from './module';

export interface UnloadApi {
  listTabs(): Promise<TabInfo[]>;
  unload(id: string): Promise<void>;
}

export const unloadApi = defineProxy<UnloadApi>(MODULE);
```

### 3. Implement the background handlers

`background.ts` — implement the interface, own any background state, and register. The
registration is a **top-level import side effect**, so it re-runs every time the worker
wakes:

```ts
import { registerModule } from '../../bridge/rpc-background';
import browser from 'webextension-polyfill';
import type { UnloadApi } from './api';
import { MODULE } from './module';

const handlers: UnloadApi = {
  async listTabs() {
    /* browser.tabs.query(...) */
  },
  async unload(id) {
    await browser.tabs.discard(Number(id));
  },
};

registerModule(MODULE, handlers);
```

Then wire it into the worker with a **side-effect import** in `src/background/background.ts`
(alongside `import '../modules/search/background';`):

```ts
import '../modules/<name>/background';
```

### 4. Build the commands

`commands.ts` — use the factories in `src/commands/factories.ts` so you never touch the
`run` discriminant:

- `openView({ id, title, icon, keywords?, view })` → a launch command that pushes a view.
- `action<T>({ id, title, icon, shortcut?, do, after? })` → a `perform` command; `after`
  defaults to `'close'`, use `'stay'` to keep the palette open (then refresh).

```ts
import { openView, action } from '../../commands/factories';
import { MODULE } from './module';
import Unload from './Unload.svelte';

export const unloadCommand = openView({
  id: MODULE,
  title: 'Unload Tabs',
  icon: MoonIcon,
  keywords: ['discard', 'memory', 'suspend'],
  view: Unload,
});
```

For a **one-shot module (shape A)**, `openView` becomes an `action` and you skip the view
entirely — the launch command _is_ the effect.

Per-row actions return a `RowActions<T>` (`{ primary, secondary? }`) — a required `primary`
runs on Enter, `secondary[]` fill the actions panel. See `commandsForItem` in
`search/commands.ts`.

### 5. Build the view (shapes B and C)

For a list-shaped view, compose `List` + `ListItem`; the module owns the `{#each}` and its
own data pipeline (`List` only reports the query). Copy the structure of `Search.svelte`:

```svelte
<List bind:query {placeholder} onSearchChange={runQuery} onRefresh={refresh}>
  {#each rows as row (row.id)}
    <ListItem id={row.id} subject={row} actions={actionsFor(row)}>
      <Row {row} />
    </ListItem>
  {/each}
</List>
```

Reach the shell via the rune singletons — `nav` (navigation), `status` (error surface),
`footer` (populated for you by `List`). Don't import the registry or `RootList`.

### 6. Register the launch command — the one wiring point

Add the launch command to the root list in `src/commands/registry.ts`:

```ts
import { searchCommand } from '../modules/search/commands';
import { unloadCommand } from '../modules/unload/commands';

export const COMMANDS: Command[] = [searchCommand, unloadCommand];
```

That's the **only** shared file you edit for the content side. (Plus the one side-effect
import in `background/background.ts` from step 3.)

### 7. Add permissions if needed

If your background handlers use a new `browser.*` API, add its permission to **both**
`public/manifest-chrome.json` and `public/manifest-firefox.json`. Search already covers
`tabs`, `storage`, `bookmarks`, `history`.

## A complete example — "Close Other Tabs"

The smallest module that still crosses the seam: a **one-shot command (shape A)** with no
view and no per-item actions. It closes every tab in the current window except the active
one. Three files, plus the two wiring lines. It needs only the `tabs` permission, which the
extension already has.

**`src/modules/close-others/module.ts`** — the identity:

```ts
/** RPC namespace and root-command id, in one place. */
export const MODULE = 'close-others';
```

**`src/modules/close-others/api.ts`** — the seam:

```ts
import { defineProxy } from '../../bridge/rpc';
import { MODULE } from './module';

/** Privileged operations this module runs in the background. */
export interface CloseOthersApi {
  closeOthers(): Promise<void>;
}

export const closeOthersApi = defineProxy<CloseOthersApi>(MODULE);
```

**`src/modules/close-others/background.ts`** — the implementation + registration:

```ts
import browser from 'webextension-polyfill';
import { registerModule } from '../../bridge/rpc-background';
import type { CloseOthersApi } from './api';
import { MODULE } from './module';

const handlers: CloseOthersApi = {
  async closeOthers() {
    const tabs = await browser.tabs.query({
      currentWindow: true,
      active: false,
    });
    const ids = tabs
      .map((tab) => tab.id)
      .filter((id): id is number => id !== undefined);
    await browser.tabs.remove(ids);
  },
};

registerModule(MODULE, handlers);
```

**`src/modules/close-others/commands.ts`** — the launch command _is_ the effect (no view):

```ts
import XCircle from '@lucide/svelte/icons/circle-x';
import { action } from '../../commands/factories';
import { closeOthersApi } from './api';
import { MODULE } from './module';

/** Root-list entry: closes every other tab, then closes the palette. */
export const closeOthersCommand = action<void>({
  id: MODULE,
  title: 'Close Other Tabs',
  icon: XCircle,
  keywords: ['tabs', 'clean', 'declutter'],
  do: () => closeOthersApi.closeOthers(),
  // after defaults to 'close'
});
```

**Wiring — the two lines that make it live:**

```ts
// src/commands/registry.ts
import { closeOthersCommand } from '../modules/close-others/commands';
export const COMMANDS: Command[] = [searchCommand, closeOthersCommand];
```

```ts
// src/background/background.ts
import '../modules/close-others/background';
```

Open the palette to the root list, type "close" — the command appears, Enter runs it, and
the palette closes. From here, growing it into a list-shaped module (shape B) means adding
`<Name>.svelte` and swapping `action(...)` for `openView(...)`; nothing else about the seam
changes.

## Checklist

- [ ] `module.ts` exports a unique `MODULE` string.
- [ ] `api.ts` uses `import type` for its data shapes; both sides reference the same interface.
- [ ] `background.ts` calls `registerModule(MODULE, handlers)` at top level.
- [ ] `background/background.ts` has the side-effect import of the module's `background.ts`.
- [ ] Reactive values are `$state.snapshot`-ed before crossing IPC.
- [ ] The launch command is in `registry.ts`.
- [ ] New `browser.*` APIs have manifest permissions in both manifests.
- [ ] `npm run check` passes; both builds succeed (`npm run build`, `npm run build:firefox`).

## Gotchas

- **RPC namespace drift.** Always derive the proxy namespace and the `registerModule` name
  from the same `MODULE` constant — never hard-code the string twice.
- **Content bundle bloat.** A stray value import (not `import type`) from a background-only
  file pulls `browser.*` and its deps into the content script that ships on every page.
- **Structured-clone throws.** A `$state` proxy crossing `sendMessage` throws; snapshot first.
- **Views load eagerly.** `view: Component` is a direct reference, not a lazy import — fine
  for a handful of modules (see the design doc's "Compared to Raycast").
- **Shared tab ops are deferred.** Tab verbs live in the search module until a second
  consumer exists (rule of three); don't extract shared infrastructure speculatively.
