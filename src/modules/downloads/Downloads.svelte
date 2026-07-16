<script lang="ts">
  import { onMount } from 'svelte';
  import List from '../../shell/list/List.svelte';
  import ListItem from '../../shell/list/ListItem.svelte';
  import DownloadRow from './DownloadRow.svelte';
  import { downloadsApi } from './api';
  import { commandsForDownload } from './commands';
  import { status, toMessage } from '../../shell/status.svelte';
  import type { DownloadEntry } from './parsers';

  let items = $state<DownloadEntry[]>([]);
  let query = $state('');
  let lastQuery = $state('');
  let reqSeq = 0;

  onMount(refresh);

  async function runQuery(next: string): Promise<void> {
    lastQuery = next;
    status.error = '';
    const id = ++reqSeq;
    try {
      const { reqId, items: results } = await downloadsApi.query(next, id);
      if (reqId === reqSeq) items = results;
    } catch (e) {
      if (id === reqSeq) status.error = toMessage(e, 'Search failed');
    }
  }

  // Invalidate the cache, then re-run the last query — for entry and after a mutating action.
  function refresh(): void {
    void downloadsApi
      .prepare()
      .then(() => runQuery(lastQuery))
      .catch((e) => {
        status.error = toMessage(e, 'Failed to refresh');
      });
  }
</script>

<List bind:query placeholder="Search downloads…" onSearchChange={(v) => void runQuery(v)} onRefresh={refresh}>
  {#each items as item (item.id)}
    <ListItem id={item.id} subject={item} actions={commandsForDownload(item)}>
      <DownloadRow {item} />
    </ListItem>
  {/each}
</List>
