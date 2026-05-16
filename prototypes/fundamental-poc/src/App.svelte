<script>
  import { visible, tabs, query } from './store.js';
  import { onMount } from 'svelte';

  let inputRef;

  $: filtered = $tabs.filter((t) =>
    (t.title || '').toLowerCase().includes(($query || '').toLowerCase())
  );

  onMount(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && $visible) {
        visible.set(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  $: if ($visible && inputRef) {
    requestAnimationFrame(() => inputRef.focus());
  }
</script>

{#if $visible}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="st-overlay" on:click={() => visible.set(false)}>
    <div class="st-popup" on:click|stopPropagation>
      <input
        bind:this={inputRef}
        bind:value={$query}
        type="text"
        placeholder="Search tabs…"
        class="st-input"
      />
      <ul class="st-list">
        {#each filtered as tab (tab.id)}
          <li class="st-item">{tab.title}</li>
        {:else}
          <li class="st-empty">No tabs found</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .st-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 20, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
    z-index: 2147483647;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
      Roboto, Helvetica, Arial, sans-serif;
  }

  .st-popup {
    width: 600px;
    max-width: 92vw;
    background: #181825;
    border: 1px solid #313244;
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }

  .st-input {
    width: 100%;
    padding: 20px 24px;
    font-size: 20px;
    color: #cdd6f4;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
  }

  .st-input::placeholder {
    color: #6c7086;
  }

  .st-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 320px;
    overflow-y: auto;
  }

  .st-item {
    padding: 14px 24px;
    color: #bac2de;
    font-size: 15px;
    border-top: 1px solid #313244;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .st-item:hover {
    background: #313244;
    color: #cdd6f4;
  }

  .st-empty {
    padding: 20px 24px;
    color: #6c7086;
    font-size: 14px;
    text-align: center;
  }
</style>
