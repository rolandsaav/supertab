<script lang="ts" generics="T">
  import { Command } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import type { Command as PaletteCommand } from '../commands/command';
  import { nav } from '../shell/nav.svelte';
  import { autofocus } from '../ui/utils.svelte';

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
    onQuery,
    onRefresh
  }: Props = $props();

  let query = $state('');
  let highlightedId = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);

  autofocus(() => inputRef);

  // Controlled mode (onQuery set) renders items as-is — the module filters. Otherwise
  // filter here against getText. A naive substring match for now; uFuzzy comes later.
  const visible = $derived.by(() => {
    if (onQuery || !query.trim() || !getText) return items;
    const needle = query.toLowerCase();
    return items.filter((entry) => getText(entry).toLowerCase().includes(needle));
  });

  function onInput(value: string): void {
    query = value;
    onQuery?.(value);
  }

  async function run(command: PaletteCommand<T>, subject: T): Promise<void> {
    if (command.run.kind === 'view') {
      nav.push(command);
      return;
    }
    await command.run.perform(subject);
    if (command.run.after === 'stay') {
      onRefresh?.();
    } else {
      nav.close();
    }
  }

  function onSelect(entry: T): void {
    const [primary] = commands(entry);
    if (primary) void run(primary, entry);
  }
</script>

<Command.Root shouldFilter={false} loop bind:value={highlightedId} class="command">
  {#if isLoading}
    <div class="header"><span class="loading">Loading…</span></div>
  {/if}

  {#if header}
    <div class="input-row">
      <Command.Input
        bind:ref={inputRef}
        value={query}
        oninput={(e) => onInput(e.currentTarget.value)}
        {placeholder}
        class="input"
      />
      {@render header()}
    </div>
  {:else}
    <Command.Input
      bind:ref={inputRef}
      value={query}
      oninput={(e) => onInput(e.currentTarget.value)}
      {placeholder}
      class="input"
    />
  {/if}

  <Command.List class="list">
    <Command.Empty class="empty">No results found</Command.Empty>
    {#each visible as entry (getId(entry))}
      <Command.Item value={getId(entry)} onSelect={() => onSelect(entry)} class="item">
        {@render item(entry)}
      </Command.Item>
    {/each}
  </Command.List>
</Command.Root>
