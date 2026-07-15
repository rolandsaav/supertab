<script lang="ts">
  import { onMount } from 'svelte';
  import ListView from '../../components/ListView.svelte';
  import { searchApi } from './api';
  import { commandsForItem } from './commands';
  import type { Item, SourceToggles } from '../../search/parsers';

  let items = $state<Item[]>([]);
  let enabled = $state<SourceToggles>({ tab: true, bookmark: false, history: false });
  let lastQuery = $state('');
  let reqSeq = 0;

  // Refresh the background cache on entry, then show the initial (empty-query) results.
  onMount(refresh);

  async function runQuery(query: string): Promise<void> {
    lastQuery = query;
    const id = ++reqSeq;
    const clean = $state.snapshot(enabled) as SourceToggles;
    const { reqId, items: next } = await searchApi.query(query, clean, id);
    if (reqId === reqSeq) items = next;
  }

  // Invalidate the cache, then re-run the last query — for after a mutating action
  // (e.g. closing a tab) so the closed item drops out.
  function refresh(): void {
    void searchApi.prepare().then(() => runQuery(lastQuery));
  }
</script>

<ListView
  {items}
  getId={(entry) => entry.id}
  placeholder="Search tabs, bookmarks & history…"
  commands={commandsForItem}
  onQuery={runQuery}
  onRefresh={refresh}
>
  {#snippet item(entry)}
    {#if entry.favIconUrl}
      <img
        class="favicon"
        src={entry.favIconUrl}
        alt=""
        onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
    {/if}
    <div class="text">
      <div class="title">{entry.title}</div>
      <div class="url">{entry.url}</div>
    </div>
  {/snippet}
</ListView>
