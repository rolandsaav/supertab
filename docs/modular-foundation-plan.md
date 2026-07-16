# Modular Foundation — Implementation Plan

**Companion to:** `docs/modular-foundation.md` (the design; its 13 decisions are binding constraints here).
**Branch:** `modular-foundation`

> **Reconciliation note (post-implementation).** This plan is a historical artifact, written
> before two things settled. Read it with these corrections; the authoritative file/symbol
> names live in `docs/modules.md` and `docs/modular-foundation.md`.
> 1. **`ListView` → `shell/list/` primitives.** The planned single `ListView` god-component
>    (a `components/ListView.svelte` configured by `items`/`getId`/`commands` props) shipped
>    instead as composable primitives: `List.svelte` (chrome + input) and `ListItem.svelte`
>    (one row, which registers its own actions via `list/context.ts`), with the **module
>    owning the `{#each}`**. Read every "`ListView`" below as that `List`/`ListItem` pair.
> 2. **Pre-migration paths.** `src/ui/*` and `src/search/*` name the **starting layout**;
>    Phase 4 relocates them to `src/components/*`, `src/modules/search/*`, and the generic
>    ranking to `src/lib/fuzzy.ts` (`order()`).
> 3. **Letter-labeled decisions (A/B)** referenced below are from an earlier design draft's
>    `ListView` decisions, since folded into the shipped design — see "Who filters — the
>    module" and the `run.ts` behavior in `docs/modular-foundation.md`.

**Starting point:** A working search-only palette. `content.ts` mounts `App.svelte` into a
shadow root and toggles it with F1; `PaletteStore` owns all state; `background.ts` answers a
`Request` union via a `handle` switch; search logic lives in `search/` (`search.ts`,
`sources.ts`, `parsers.ts`, `ranking.ts`) and `background/visited.ts`. All of that keeps
working until the cleanup phase — new code lands alongside the old.

**Scope:** foundation (RPC layer, `Command`/`View`/`Nav`, the `shell/list/` primitives, shell) +
migrate search into the first module. **No new feature modules.**

**Reuse (do not re-implement):** `search/search.ts#search`, `search/sources.ts#SOURCES`,
`search/parsers.ts` (`Item`/`Kind`/`SourceToggles` + parsers), `search/ranking.ts#rank`
(uFuzzy), `background/visited.ts`, `ui/sources.ts` (`SOURCE_META`/`parseSourceCommand`/
`searchPlaceholder`), `ui/utils.svelte.ts`, `ui/{Footer,Key,KeyCombo,SourceIcons}.svelte`,
bits-ui `Command`. The migration **relocates** the search cache and handlers — it does not
rewrite ranking or fetching.

---

## Phase 0: Contracts & Interfaces
*Types and signatures only — no implementation bodies. This is the seam everything else builds against.*

- [ ] `bridge/rpc.ts` (shared + content):
  - `interface RpcRequest { module: string; op: string; args: unknown[] }`
  - `type RpcResponse = { ok: true; value: unknown } | { ok: false; error: string }`
  - `defineProxy<T extends object>(module: string): T` — Proxy stand-in (decision 13).
- [ ] `bridge/rpc-background.ts` (background):
  - `registerModule(name: string, handlers: object): void`
  - dispatcher: **must ignore messages without a `module` field** so it coexists with the
    old `Request` listener during migration.
- [ ] `commands/command.ts`:
  - `interface Command<T = void>` (`id`, `title`, `icon`, `keywords?`, `shortcut?`, `run`)
  - `type CommandRun<T> = { kind: 'view'; view: View } | { kind: 'perform'; perform: (subject: T) => Promise<void>; after?: 'close' | 'stay' }`
  - `Shortcut` type moved here from `actions/registry.ts`.
- [ ] `shell/view.ts`: `type View = Component` (prop-free — decision 7).
- [ ] `shell/nav.svelte.ts`: `interface Frame { view: View; title: string }`; `Nav` API —
  `visible`, `stack`, `current`, `canPop`, `open(target?, { keepRoot=true })`, `push(command)`,
  `pop()`, `close()` (decisions 1, 5).
- [ ] `modules/search/api.ts`: `interface SearchApi` (`prepare`, `query`, `activateTab`,
  `closeTab`, `duplicateTab`, `openUrl`) + `export const searchApi = defineProxy<SearchApi>('search')`.
- [ ] `shell/list/` primitive prop contracts (types only). `List.svelte`: `placeholder`,
  `isLoading?`, `query?` (bindable), `header?`, `onSearchChange?`, `onRefresh?`, `children`.
  `ListItem.svelte<T>`: `id`, `actions: RowActions<T>`, `subject?`, `children`. The module
  owns the `{#each}`; each `ListItem` registers its actions through `list/context.ts`.
  *(Planned as one `components/ListView.svelte` — see the reconciliation note.)*

**✓ Checkpoint:**
- [ ] `npm run check` passes with the new type files present and referenced by stub imports.
- [ ] Every design-doc symbol has a home; no `Action` type survives (unified into `Command<T>` — decision 8).

---

## Phase 1: Tracer Bullet — hotkey → root → push search → query over RPC → run primary command
*Goal: prove the whole architecture end-to-end with the thinnest real implementation of every layer.*
*Resolves the two biggest unknowns at once: (a) the hand-rolled Proxy/dispatcher round-trips over MV3 IPC, including registration on worker wake; (b) the nav stack renders a dynamic `View` inside the shadow root and runs a `CommandRun`.*

- [ ] `bridge/rpc.ts` + `rpc-background.ts` implemented (Proxy, `call`, dispatcher, registry).
  - Done when: a temporary `ping` handler registered in background returns a value to a content-side proxy call, and a call made *after* the service worker is force-idled still succeeds (registration re-ran on wake).
- [ ] `modules/search/background.ts`: move the search `cache` + `fillPool` out of `background.ts`; implement `SearchApi` handlers by calling existing `search()`/`SOURCES`/`browser.tabs.*`; `registerModule('search', …)`. Keep the old `handle` switch untouched for now.
  - Done when: both listeners coexist; the old palette still works and the new `searchApi.query(...)` returns ranked items.
- [ ] `shell/nav.svelte.ts` implemented; `shell/Shell.svelte` renders `nav.current.view` dynamically inside the overlay/popup (lift the shadow-DOM overlay markup from `App.svelte`).
- [ ] `shell/list/List.svelte` + `ListItem.svelte` — **minimal**: bits-ui `Command.Root` + input + list; the module renders rows as `children` and each `ListItem` registers its `RowActions`; Enter runs the highlighted row's `primary`; `view`→`nav.push`, `perform`+`close`→perform then `nav.close()` (via `list/run.ts#runCommand`). **Naive substring filter** for now. No actions panel, back button, footer, toggles yet.
- [ ] `modules/search/{commands.ts,Search.svelte}` — `searchCommand` + a minimal `commandsForItem` (tab `activate`/`close`; bookmark/history `open`); `Search.svelte` wires `items`/`onQuery` to `searchApi` with `$state.snapshot(enabled)` before IPC and `reqSeq` stale-drop.
- [ ] `shell/RootList.svelte` + `commands/registry.ts` (`COMMANDS = [searchCommand]`); `RootList` composes `List`/`ListItem`, filtering `COMMANDS` itself, each row's `primary` being the command's own `run`.
- [ ] Point `content/content.ts` at `Shell` instead of `App`; F1 toggle → `nav.open('search')` (search view with root left underneath) / `nav.close()`; Escape → `nav.pop()`.
  - Done when: F1 opens the **search view directly**; typing returns tab results **via the new RPC path**; Enter on a tab activates it and the palette closes; Escape from search backs out to the root list showing "Search".

**✓ Checkpoint — confirm before Phase 2:**
- [ ] Full path works in-browser: F1 → search → type → results → Enter activates tab → closes; Escape from search → root list.
- [ ] Query and activate both round-trip through `bridge/rpc.ts` (verified: old `SEARCH`/`ACTIVATE_TAB` cases are not hit on this path).
- [ ] New dispatcher ignores old `Request` messages; old palette path (if still mounted anywhere) is unaffected.
- [ ] `$state.snapshot` guards every reactive value crossing IPC (no structured-clone throw).
- [ ] `npm run check` passes.

---

## Phase 2: Complete the list primitives
*Goal: bring the `shell/list/` primitives to parity with today's palette so search loses nothing. Refine against tracer results before starting.*

- [ ] Actions panel overlay (right-click / shortcut), listing `commands(item)`; shortcut matching via `matchesShortcut` (reuse `utils.svelte.ts`). Folds in old `ActionsPanel` (decision 3).
- [ ] `perform`+`after: 'stay'` → `onRefresh?.()` (decision B).
- [ ] Back button left of input, shown when `nav.canPop`; click = `nav.pop()` (decision 11).
- [ ] Footer slot driven by the highlighted item's primary command; define the minimal footer context the view populates (reuse `Footer.svelte`). Non-list footer stays deferred.
- [ ] Internal filter upgraded from naive substring to uFuzzy via the generic `lib/fuzzy.ts#order` (arbitrary string fields), used by `RootList` in a `$derived`.
- [ ] Keyboard nav parity: loop, vim keys, `tabNav` (reuse `utils.svelte.ts`).

**✓ Checkpoint:**
- [ ] Actions panel, back button, footer, and fuzzy root filtering all work; `after: 'stay'` refreshes without closing.
- [ ] Reuses `utils.svelte.ts`, the generic uFuzzy `order()` (`lib/fuzzy.ts`), and `Footer.svelte` rather than re-implementing.

---

## Phase 3: Complete the search module
*Goal: full feature parity with the current search experience, now fully on the new foundation.*

- [ ] Full `commandsForItem`: bookmark/history `open` + `copyUrl`; tab `duplicate` + `copyUrl`; `copyUrl` stays content-side (`navigator.clipboard`) — verifies the actions-vs-operations boundary.
- [ ] Source toggles + `@t/@b/@h` commands + placeholder via the `header` snippet; reuse `SOURCE_META`/`parseSourceCommand`/`searchPlaceholder` and `SourceIcons.svelte` (moved into `modules/search/`).
- [ ] `prepare()` on `onMount`; visited badge; error surfacing equivalent to today.
- Search-specific UI (`sources.ts`, `SourceIcons.svelte`) is reused **in place** from `ui/` for now; the physical relocation is deferred to Phase 4's rename sweep, so the still-present legacy files that import them don't break and nothing is duplicated.

**✓ Checkpoint:**
- [ ] Search module matches the pre-refactor palette feature-for-feature (toggles, @-commands, badge, all per-item actions, errors).

---

## Phase 4: Retire old code & finalize
*Goal: remove the parallel old path and the scaffolding it required.*

- [ ] Delete `bridge/messages.ts`, `bridge/background-bridge.ts`, the `handle` switch, `actions/registry.ts`, `ui/App.svelte`, `ui/CommandPalette.svelte`, `ui/ActionsPanel.svelte`, and `PaletteStore`.
  - Deleting `actions/registry.ts` orphans the `Shortcut` type it defines — **repoint** `ui/utils.svelte.ts` and `ui/KeyCombo.svelte` to import `Shortcut` from `commands/command.ts` (which is now its authoritative home; the two definitions are duplicated during migration).
- [ ] `background/background.ts` collapses to: import each module's `background.ts` (side-effect registration) + the global visited-set lifecycle listeners.
  - This removes the search cache / `fillPool` / `duplicateTab` now duplicated in `modules/search/background.ts`, and the RPC-envelope guard (`'module' in message`) on the legacy listener — once the legacy handler is gone, no message needs routing around.
  - The `isRpcRequest` guard in `rpc-background.ts` stays (it's the dispatcher's own filter), but no longer coexists with a second copy.
- [ ] Relocate `src/ui`: search-specific UI (`sources.ts`, `SourceIcons.svelte`) → `modules/search/`; shared chrome (`Footer`, `Key`, `KeyCombo`, `utils`, `app.css`) → `components/`. Fix all imports; `mount.ts` targets `Shell`.
- [ ] Build both targets (`npm run build`, `npm run build:firefox`); `npm run check` clean.

**✓ Checkpoint:**
- [ ] No references to deleted files remain; dispatcher no longer needs the `module`-field guard (old listener is gone).
- [ ] Both browser builds succeed; type-check the **committed** tree, not just the working tree.
- [ ] Manual daily-drive pass: open latency still feels < 150 ms.

---

## Deferred
- **Shared `tabs` ops module** — deferred until a second consumer (Unload Tabs / Tab Groups) exists; extract then (rule of three, design doc "Deferred").
- **Footer API for non-list modules** — deferred until a non-list module exists; `List` fills the footer for now (decision 3).
- **Lazy-loaded module views** — deferred until bundle size threatens the <150 ms open target; views load eagerly (design doc "Compared to Raycast").
- **`Command` factory library** (`copyUrl`/`openInNewTab` helpers) — deferred; nice-to-have, not foundational.
- **`@webext-core/messaging`** — only if maintaining the hand-rolled RPC ever chafes (decision 12).

## Notes on reversibility
- The **`content.ts` → Shell switch** (Phase 1) is the one integration point that can break the extension globally (shadow DOM, hotkey containment, key event `stopPropagation`). Keep `App.svelte` mountable until Phase 4 so reverting is a one-line change.
- Everything deleted in Phase 4 is recoverable via git; do it only after the Phase 3 checkpoint proves parity.
