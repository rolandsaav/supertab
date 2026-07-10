<script lang="ts">
  import { Command } from 'bits-ui';
  import type { Item } from '../search/parsers';
  import { actionsFor, formatShortcut, type Action } from '../actions/registry';
  import { tabNav, autofocus } from './utils.svelte';

  interface Props {
    item: Item;
    onRun: (action: Action) => void;
  }

  let { item, onRun }: Props = $props();

  let query = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);

  const actions = $derived(actionsFor(item.kind));

  autofocus(() => inputRef);
</script>

<Command.Root loop onkeydown={(e) => tabNav(e, inputRef)} class="actions">
  <Command.List class="actions-list">
    <Command.Empty class="empty">No actions</Command.Empty>
    {#each actions as action (action.id)}
      {@const Icon = action.icon}
      <Command.Item value={action.label} onSelect={() => onRun(action)} class="action-item">
        <Icon size={16} />
        <span class="action-label">{action.label}</span>
        {#if action.shortcut}
          <span class="action-shortcut">{formatShortcut(action.shortcut)}</span>
        {/if}
      </Command.Item>
    {/each}
  </Command.List>
  <Command.Input
    bind:ref={inputRef}
    bind:value={query}
    placeholder="Search actions…"
    class="actions-input"
  />
</Command.Root>
