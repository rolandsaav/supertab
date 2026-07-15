<script lang="ts">
  import { onMount } from 'svelte';
  import ListView from '../../components/ListView.svelte';
  import SourceIcons from './SourceIcons.svelte';
  import { searchApi } from './api';
  import { commandsForItem } from './commands';
  import { searchPlaceholder, parseSourceCommand } from './sources';
  import { status, toMessage } from '../../shell/status.svelte';
  import type { Item, Kind, SourceToggles } from '../../search/parsers';

  let items = $state<Item[]>([]);
  let enabled = $state<SourceToggles>({ tab: true, bookmark: false, history: false });
  let query = $state('');
  let lastQuery = $state('');
  let reqSeq = 0;

  const placeholder = $derived(searchPlaceholder(enabled));

  // Refresh the background cache on entry, then show the initial (empty-query) results.
  onMount(refresh);

  async function runQuery(next: string): Promise<void> {
    lastQuery = next;
    status.error = '';
    const id = ++reqSeq;
    try {
      const clean = $state.snapshot(enabled) as SourceToggles;
      const { reqId, items: results } = await searchApi.query(next, clean, id);
      if (reqId === reqSeq) items = results;
    } catch (e) {
      if (id === reqSeq) status.error = toMessage(e, 'Search failed');
    }
  }

  // Invalidate the cache, then re-run the last query — for entry and after a mutating
  // action (e.g. closing a tab) so the closed item drops out.
  function refresh(): void {
    void searchApi
      .prepare()
      .then(() => runQuery(lastQuery))
      .catch((e) => {
        status.error = toMessage(e, 'Failed to refresh');
      });
  }

  // A lone @-command enables its source and clears the input, then re-queries the
  // now-empty input (not the stale @-text) so recent results show.
  function onInput(value: string): void {
    const kind = parseSourceCommand(value);
    if (kind) {
      if (!enabled[kind]) enabled = { ...enabled, [kind]: true };
      query = '';
      void runQuery('');
      return;
    }
    void runQuery(value);
  }

  // Toggle a source, but never disable the last one. Re-query so a newly-enabled
  // source is fetched (the background fills it lazily) or a disabled one drops out.
  function toggle(kind: Kind): void {
    const onCount = Object.values(enabled).filter(Boolean).length;
    if (enabled[kind] && onCount === 1) return;
    enabled = { ...enabled, [kind]: !enabled[kind] };
    void runQuery(lastQuery);
  }
</script>

<ListView
  {items}
  bind:query
  getId={(entry) => entry.id}
  {placeholder}
  commands={commandsForItem}
  onQuery={onInput}
  onRefresh={refresh}
>
  {#snippet header()}
    <SourceIcons {enabled} onToggle={toggle} />
  {/snippet}
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
    {#if entry.kind === 'tab' && !entry.visited}
      <span class="badge" title="Not visited yet" aria-label="Not visited yet"></span>
    {/if}
  {/snippet}
</ListView>
