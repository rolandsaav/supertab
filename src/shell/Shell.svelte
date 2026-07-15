<script lang="ts">
  import { nav } from './nav.svelte';
  import { footer } from './footer.svelte';
  import RootList from './RootList.svelte';
  import Footer from '../ui/Footer.svelte';

  nav.setRoot({ view: RootList, title: 'SuperTab' });
  const Current = $derived(nav.current?.view);
</script>

{#if nav.visible && Current}
  <div
    class="overlay"
    role="button"
    tabindex="0"
    onclick={(e) => { if (e.target === e.currentTarget) nav.close(); }}
    onkeydown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) nav.close(); }}
  >
    <div class="popup" role="dialog" aria-modal="true" tabindex="-1">
      <div class="body">
        {#key nav.current}
          <Current />
        {/key}
      </div>
      <Footer primaryLabel={footer.primaryLabel} hasActions={footer.hasActions} />
    </div>
  </div>
{/if}
