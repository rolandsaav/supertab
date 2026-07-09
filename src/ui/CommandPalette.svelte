<script lang="ts">
  import type { Item } from '../search/parsers';

  interface Props {
    results: Item[];
    query: string;
    isLoading: boolean;
    onSelect: (item: Item) => void;
  }

  let { results, query = $bindable(), isLoading, onSelect }: Props = $props();

  let inputRef = $state<HTMLInputElement | null>(null);

  // Auto-focus the input on mount. The palette remounts on each open, so this
  // runs once per open when inputRef becomes available.
  $effect(() => {
    if (inputRef) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });
</script>

{#if isLoading}
  <div class="header">
    <span class="loading">Loading…</span>
  </div>
{/if}

<input
  bind:this={inputRef}
  bind:value={query}
  type="text"
  placeholder="Search tabs…"
  class="input"
/>

<div class="list">
  {#each results as item (item.id)}
    <button type="button" class="item" onclick={() => onSelect(item)}>
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
    </button>
  {:else}
    <div class="empty">No results found</div>
  {/each}
</div>
