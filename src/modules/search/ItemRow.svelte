<script lang="ts">
  import type { Item } from '../../search/parsers';
  let { item }: { item: Item } = $props();
</script>

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
