<script lang="ts" generics="T">
  import { Command } from 'bits-ui';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import type { Snippet } from 'svelte';
  import type { Command as PaletteCommand } from '../commands/command';
  import { nav } from '../shell/nav.svelte';
  import { footer } from '../shell/footer.svelte';
  import { status, toMessage } from '../shell/status.svelte';
  import { order } from '../lib/fuzzy';
  import { autofocus, tabNav, matchesShortcut, OPEN_ACTIONS_SHORTCUT } from './utils.svelte';
  import ActionsPanel from './ActionsPanel.svelte';

  interface Props {
    items: T[];
    getId: (item: T) => string;
    /** Searchable text for internal filtering. Ignored when `onQuery` is set. */
    getText?: (item: T) => string;
    placeholder: string;
    commands: (item: T) => PaletteCommand<T>[];
    item: Snippet<[T]>;
    header?: Snippet;
    isLoading?: boolean;
    /** The input value — bindable so a module can rewrite it (e.g. clear on an @-command). */
    query?: string;
    onQuery?: (query: string) => void;
    onRefresh?: () => void;
  }

  let {
    items,
    getId,
    getText,
    placeholder,
    commands,
    item,
    header,
    isLoading = false,
    query = $bindable(''),
    onQuery,
    onRefresh
  }: Props = $props();
  let highlightedId = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let actionsOpen = $state(false);
  let actionTarget = $state<T | null>(null);

  // Refocus the main input when the actions panel is closed.
  autofocus(() => inputRef, () => !actionsOpen);

  // Controlled mode (onQuery set) renders items as-is — the module filters. Otherwise
  // rank here with the shared fuzzy engine.
  const visible = $derived.by(() => {
    if (onQuery || !query.trim() || !getText) return items;
    const haystack = items.map(getText);
    return order(haystack, query).map((index) => items[index]);
  });

  const highlighted = $derived(
    visible.find((entry) => getId(entry) === highlightedId) ?? visible[0]
  );

  const panelActions = $derived(actionsOpen && actionTarget ? commands(actionTarget) : []);

  // Keep the shell footer showing the highlighted row's primary action.
  $effect(() => {
    const available = highlighted ? commands(highlighted) : [];
    footer.primaryLabel = available[0]?.title;
    footer.hasActions = available.length > 1;
  });

  // Let Escape close the actions panel before the shell steps back a view.
  $effect(() => {
    nav.setEscapeInterceptor(() => {
      if (actionsOpen) {
        closeActions();
        return true;
      }
      return false;
    });
    return () => nav.setEscapeInterceptor(null);
  });

  function onInput(value: string): void {
    query = value;
    onQuery?.(value);
  }

  async function run(command: PaletteCommand<T>, subject: T): Promise<void> {
    status.error = '';
    if (command.run.kind === 'view') {
      nav.push(command);
      return;
    }
    try {
      await command.run.perform(subject);
    } catch (e) {
      status.error = toMessage(e, 'Action failed');
      return;
    }
    if (command.run.after === 'stay') {
      onRefresh?.();
    } else {
      nav.close();
    }
  }

  function openActions(target: T | undefined = highlighted): void {
    if (!target || commands(target).length === 0) return;
    actionTarget = target;
    actionsOpen = true;
  }

  function closeActions(): void {
    actionsOpen = false;
  }

  function runFromPanel(command: PaletteCommand<T>): void {
    const subject = actionTarget;
    closeActions();
    if (subject) void run(command, subject);
  }

  function onSelect(entry: T): void {
    const [primary] = commands(entry);
    if (primary) void run(primary, entry);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (matchesShortcut(e, OPEN_ACTIONS_SHORTCUT)) {
      e.preventDefault();
      openActions();
      return;
    }
    if (highlighted) {
      const match = commands(highlighted).find(
        (command) => command.shortcut && matchesShortcut(e, command.shortcut)
      );
      if (match) {
        e.preventDefault();
        void run(match, highlighted);
        return;
      }
    }
    tabNav(e, inputRef);
  }
</script>

<Command.Root
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
      <button type="button" class="back" aria-label="Back" onclick={() => nav.pop()}>
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
    {#each visible as entry (getId(entry))}
      <Command.Item
        value={getId(entry)}
        onSelect={() => onSelect(entry)}
        oncontextmenu={(e) => { e.preventDefault(); openActions(entry); }}
        class="item"
      >
        {@render item(entry)}
      </Command.Item>
    {/each}
  </Command.List>
</Command.Root>

{#if actionsOpen && actionTarget}
  <ActionsPanel actions={panelActions} onRun={runFromPanel} />
{/if}
