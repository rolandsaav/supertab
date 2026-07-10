<script lang="ts">
  import { store } from './stores.svelte';
  import { primaryAction } from '../actions/registry';
  import CommandPalette from './CommandPalette.svelte';
  import ActionsPanel from './ActionsPanel.svelte';
  import Footer from './Footer.svelte';
  import type { Item } from '../search/parsers';

  const highlighted = $derived(store.results.find((i) => i.id === store.highlightedId));

  const current = $derived(highlighted ?? store.results[0]);
  const primaryLabel = $derived(current ? primaryAction(current.kind)?.label : undefined);

  /**
   * Refetch tabs on every open so recency ordering (`lastAccessed`) reflects
   * the tab you just switched away from. The previous list stays visible while
   * the new one loads, so there is no empty flash.
   */
  $effect(() => {
    if (store.visible) {
      void store.refetch();
    }
  });

  /** Run the item's primary action (Enter / click on the list). */
  function onSelect(item: Item) {
    const action = primaryAction(item.kind);
    if (action) void store.runAction(action, item);
  }
</script>

{#if store.visible}
  <div
    class="overlay"
    role="button"
    tabindex="0"
    onclick={(e) => { if (e.target === e.currentTarget) store.close(); }}
    onkeydown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) store.close(); }}
  >
    <div class="popup" role="dialog" aria-modal="true" tabindex="-1">
      <div class="body">
        <CommandPalette
          results={store.results}
          bind:query={store.query}
          bind:highlightedId={store.highlightedId}
          active={store.mode === 'list'}
          isLoading={store.isLoading}
          {onSelect}
          onActions={() => store.openActions()}
        />
        {#if store.mode === 'actions' && highlighted}
          <ActionsPanel
            item={highlighted}
            onRun={(action) => highlighted && store.runAction(action, highlighted)}
          />
        {/if}
      </div>
      {#if store.error}
        <div class="error">{store.error}</div>
      {/if}
      {#if current}
        <Footer {primaryLabel} />
      {/if}
    </div>
  </div>
{/if}
