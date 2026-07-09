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
  <div class="st-header">
    <span class="st-loading">Loading…</span>
  </div>
{/if}

<input
  bind:this={inputRef}
  bind:value={query}
  type="text"
  placeholder="Search tabs…"
  class="st-input"
/>

<div class="st-list">
  {#each results as item (item.id)}
    <button type="button" class="st-item" onclick={() => onSelect(item)}>
      {#if item.favIconUrl}
        <img
          class="st-favicon"
          src={item.favIconUrl}
          alt=""
          onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      {/if}
      <div class="st-text">
        <div class="st-title">{item.title}</div>
        <div class="st-url">{item.url}</div>
      </div>
    </button>
  {:else}
    <div class="st-empty">No results found</div>
  {/each}
</div>
