<script lang="ts">
  import { Command } from 'bits-ui';
  import type { Item } from '../search/parsers';
  import { tabNav, autofocus, isMac } from './utils.svelte';

  interface Props {
    results: Item[];
    query: string;
    highlightedId: string;
    active: boolean;
    isLoading: boolean;
    onSelect: (item: Item) => void;
    onActions: () => void;
  }

  let {
    results,
    query = $bindable(),
    highlightedId = $bindable(),
    active,
    isLoading,
    onSelect,
    onActions
  }: Props = $props();

  let inputRef = $state<HTMLInputElement | null>(null);

  autofocus(() => inputRef, () => active);

  function onKeydown(e: KeyboardEvent) {
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (e.key === 'Enter' && mod) {
      e.preventDefault();
      onActions();
      return;
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
    <div class="header">
      <span class="loading">Loading…</span>
    </div>
  {/if}

  <Command.Input
    bind:ref={inputRef}
    bind:value={query}
    placeholder="Search tabs…"
    class="input"
  />

  <Command.List class="list">
    <Command.Empty class="empty">No results found</Command.Empty>
    {#each results as item (item.id)}
      <Command.Item value={item.id} onSelect={() => onSelect(item)} class="item">
        {#if item.favIconUrl}
          <img
            class="favicon"
            src={item.favIconUrl}
            alt=""
            onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        {/if}
        <div class="text">
          <div class="title">{item.title}</div>
          <div class="url">{item.url}</div>
        </div>
        {#if item.kind === 'tab' && !item.visited}
          <span class="badge" title="Not visited yet" aria-label="Not visited yet"></span>
        {/if}
      </Command.Item>
    {/each}
  </Command.List>
</Command.Root>
