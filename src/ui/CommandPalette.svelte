<script lang="ts">
  import { Command } from 'bits-ui';
  import type { Item } from '../search/parsers';

  interface Props {
    results: Item[];
    query: string;
    isLoading: boolean;
    onSelect: (item: Item) => void;
  }

  let { results, query = $bindable(), isLoading, onSelect }: Props = $props();

  let inputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (inputRef) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  function onTabNav(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    inputRef?.dispatchEvent(
      new KeyboardEvent('keydown', { key: e.shiftKey ? 'ArrowUp' : 'ArrowDown', bubbles: true })
    );
  }
</script>

<Command.Root shouldFilter={false} loop onkeydown={onTabNav} class="command">
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
