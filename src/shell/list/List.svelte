<script lang="ts">
  import type { Snippet } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { Command } from 'bits-ui';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import type { Command as PaletteCommand } from '../../commands/command';
  import { nav } from '../nav.svelte';
  import { footer } from '../footer.svelte';
  import {
    autofocus,
    tabNav,
    matchAction,
    matchesShortcut,
    OPEN_ACTIONS_SHORTCUT,
  } from '../../components/utils.svelte';
  import ActionsPanel from '../../components/ActionsPanel.svelte';
  import { runCommand } from './run';
  import {
    setListContext,
    allActions,
    hasSecondaryActions,
    type ItemEntry,
  } from './context';

  interface Props {
    placeholder: string;
    isLoading?: boolean;
    /** The input value — bindable so a module can rewrite it (e.g. clear on an @-command). */
    query?: string;
    header?: Snippet;
    /** Present → the module reacts to each keystroke (controlled). Absent → the module
     * just filters its own items off the bound query. */
    onSearchChange?: (query: string) => void;
    onRefresh?: () => void;
    children: Snippet;
  }
  let {
    placeholder,
    isLoading = false,
    query = $bindable(''),
    header,
    onSearchChange,
    onRefresh,
    children,
  }: Props = $props();

  const registry = new SvelteMap<string, ItemEntry>();
  let highlightedId = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let commandRoot = $state<ReturnType<typeof Command.Root> | null>(null);
  let actionsOpen = $state(false);
  let actionTargetId = $state('');

  // Refocus the main input when the actions panel is closed.
  autofocus(
    () => inputRef,
    () => !actionsOpen,
  );

  const highlightedEntry = $derived(registry.get(highlightedId));
  const panelEntry = $derived(
    actionsOpen ? registry.get(actionTargetId) : undefined,
  );

  // Keep the shell footer showing the highlighted row's primary action.
  $effect(() => {
    const actions = highlightedEntry?.actions;
    footer.primaryLabel = actions?.primary.title;
    footer.hasActions = !!actions && hasSecondaryActions(actions);
  });

  // Own Escape only while the panel is open, so it closes before the shell steps back a view.
  $effect(() => {
    if (!actionsOpen) return;
    nav.setEscapeInterceptor(() => {
      closeActions();
      return true;
    });
    return () => nav.setEscapeInterceptor(null);
  });

  function openActions(id: string): void {
    const actions = registry.get(id)?.actions;
    if (!actions || !hasSecondaryActions(actions)) return;
    actionTargetId = id;
    actionsOpen = true;
  }

  function closeActions(): void {
    actionsOpen = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- panel commands act on heterogeneous subjects
  function runFromPanel(command: PaletteCommand<any>): void {
    const entry = registry.get(actionTargetId);
    closeActions();
    if (entry) void runCommand(command, entry.subject, onRefresh);
  }

  setListContext({
    register: (id, entry) => registry.set(id, entry),
    unregister: (id) => registry.delete(id),
    select: (id) => {
      const entry = registry.get(id);
      if (entry)
        void runCommand(entry.actions.primary, entry.subject, onRefresh);
    },
    openActions,
  });

  function onInput(value: string): void {
    query = value;
    onSearchChange?.(value);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (matchesShortcut(e, OPEN_ACTIONS_SHORTCUT)) {
      e.preventDefault();
      if (highlightedId) openActions(highlightedId);
      return;
    }
    const entry = highlightedEntry;
    if (entry) {
      const match = matchAction(e, allActions(entry.actions));
      if (match) {
        e.preventDefault();
        void runCommand(match, entry.subject, onRefresh);
        return;
      }
    }
    tabNav(e, commandRoot);
  }
</script>

<Command.Root
  bind:this={commandRoot}
  shouldFilter={false}
  loop
  bind:value={highlightedId}
  onkeydown={onKeydown}
  class="command"
>
  {#if isLoading}
    <div class="header"><span class="loading">Loading…</span></div>
  {/if}

  <div class="input-row">
    {#if nav.canPop}
      <button
        type="button"
        class="back"
        aria-label="Back"
        onclick={() => nav.pop()}
      >
        <ArrowLeft size={18} />
      </button>
    {/if}
    <Command.Input
      bind:ref={inputRef}
      value={query}
      oninput={(e) => onInput(e.currentTarget.value)}
      {placeholder}
      class="input"
    />
    {#if header}{@render header()}{/if}
  </div>

  <Command.List class="list">
    <Command.Empty class="empty">No results found</Command.Empty>
    {@render children()}
  </Command.List>
</Command.Root>

{#if actionsOpen && panelEntry}
  <ActionsPanel actions={allActions(panelEntry.actions)} onRun={runFromPanel} />
{/if}
