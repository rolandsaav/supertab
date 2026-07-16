<script lang="ts">
  import Pin from '@lucide/svelte/icons/pin';
  import Volume2 from '@lucide/svelte/icons/volume-2';
  import VolumeX from '@lucide/svelte/icons/volume-x';
  import type { Item } from './parsers';
  let { item }: { item: Item } = $props();
</script>

{#if item.favIconUrl}
  <img
    class="favicon"
    src={item.favIconUrl}
    alt=""
    onerror={(e) => {
      (e.currentTarget as HTMLImageElement).style.display = 'none';
    }}
  />
{/if}
<div class="text">
  <div class="title">{item.title}</div>
  <div class="url">{item.url}</div>
</div>
{#if item.kind === 'tab'}
  {#if item.pinned}
    <Pin class="indicator" size={12} title="Pinned" aria-label="Pinned" />
  {/if}
  {#if item.muted}
    <VolumeX class="indicator" size={12} title="Muted" aria-label="Muted" />
  {:else if item.audible}
    <Volume2
      class="indicator"
      size={12}
      title="Playing audio"
      aria-label="Playing audio"
    />
  {/if}
  {#if !item.visited}
    <span class="badge" title="Not visited yet" aria-label="Not visited yet"
    ></span>
  {/if}
{/if}
