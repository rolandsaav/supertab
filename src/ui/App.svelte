<script lang="ts">
  import { store } from './stores.svelte';
  import { getTabs, activateTab } from '../bridge/background-bridge';
  import CommandPalette from './CommandPalette.svelte';
  import type { Item } from '../search/parsers';

  /**
   * Refetch tabs on every open so recency ordering (`lastAccessed`) reflects
   * the tab you just switched away from. The previous list stays visible while
   * the new one loads, so there is no empty flash.
   */
  $effect(() => {
    if (store.visible) {
      fetchAll();
    }
  });

  async function fetchAll() {
    store.isLoading = true;
    store.error = '';
    try {
      const tabs = await getTabs();
      store.setTabs(tabs);
    } catch (err) {
      store.error = err instanceof Error ? err.message : 'Failed to load data';
      console.error('[SuperTab]', err);
    } finally {
      store.isLoading = false;
    }
  }

  /** Activate the selected tab. */
  function onSelect(item: Item) {
    void activateTab(item.id);
    store.close();
  }
</script>

{#if store.visible}
  <div
    class="st-overlay"
    role="button"
    tabindex="0"
    onclick={(e) => { if (e.target === e.currentTarget) store.close(); }}
    onkeydown={(e) => e.key === 'Enter' && store.close()}
  >
    <div class="st-popup" role="dialog" aria-modal="true" tabindex="-1">
      <CommandPalette
        results={store.results}
        bind:query={store.query}
        isLoading={store.isLoading}
        {onSelect}
      />
      {#if store.error}
        <div class="st-error">{store.error}</div>
      {/if}
    </div>
  </div>
{/if}
