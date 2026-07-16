<script lang="ts" generics="T">
  import { Command } from 'bits-ui';
  import type { Command as PaletteCommand } from '../commands/command';
  import { autofocus, matchAction, tabNav } from './utils.svelte';
  import KeyCombo from './KeyCombo.svelte';

  interface Props {
    actions: PaletteCommand<T>[];
    onRun: (command: PaletteCommand<T>) => void;
  }

  let { actions, onRun }: Props = $props();

  let query = $state('');
  let inputRef = $state<HTMLInputElement | null>(null);
  let commandRoot = $state<ReturnType<typeof Command.Root> | null>(null);

  autofocus(() => inputRef);

  function onKeydown(e: KeyboardEvent): void {
    const match = matchAction(e, actions);
    if (match) {
      e.preventDefault();
      onRun(match);
      return;
    }
    tabNav(e, commandRoot);
  }
</script>

<Command.Root
  bind:this={commandRoot}
  loop
  onkeydown={onKeydown}
  class="actions"
>
  <Command.List class="actions-list">
    <Command.Empty class="empty">No actions</Command.Empty>
    {#each actions as action (action.id)}
      {@const Icon = action.icon}
      <Command.Item
        value={action.title}
        onSelect={() => onRun(action)}
        class="action-item"
      >
        <Icon size={16} />
        <span class="action-label">{action.title}</span>
        {#if action.shortcut}
          <span class="action-shortcut"
            ><KeyCombo shortcut={action.shortcut} /></span
          >
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
