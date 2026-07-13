<script lang="ts">
  import { Command } from 'bits-ui';
  import type { Item, Kind, SourceToggles } from '../search/parsers';
  import { tabNav, autofocus, matchesShortcut, OPEN_ACTIONS_SHORTCUT } from './utils.svelte';
  import SourceIcons from './SourceIcons.svelte';

  interface Props {
    results: Item[];
    query: string;
    highlightedId: string;
    active: boolean;
    isLoading: boolean;
    enabled: SourceToggles;
    onSelect: (item: Item) => void;
    onActions: () => void;
    onToggleSource: (kind: Kind) => void;
    onInput: (value: string) => void;
  }

  let {
    results,
    query,
    highlightedId = $bindable(),
    active,
    isLoading,
    enabled,
    onSelect,
    onActions,
    onToggleSource,
    onInput
  }: Props = $props();

  let inputRef = $state<HTMLInputElement | null>(null);

  autofocus(() => inputRef, () => active);

  function onKeydown(e: KeyboardEvent) {
    if (matchesShortcut(e, OPEN_ACTIONS_SHORTCUT)) {
      e.preventDefault();
      onActions();
      return;
    }
    tabNav(e, inputRef);
  }
</script>

<Command.Root
  shouldFilter={false}
  loop
  bind:value={highlightedId}
  onkeydown={onKeydown}
  class="command"
>
  {#if isLoading}
    <div class="header">
      <span class="loading">Loading…</span>
    </div>
  {/if}

  <div class="input-row">
    <Command.Input
      bind:ref={inputRef}
      value={query}
      oninput={(e) => onInput(e.currentTarget.value)}
      placeholder="Search…"
      class="input"
    />
    <SourceIcons {enabled} onToggle={onToggleSource} />
  </div>

  <Command.List class="list">
    <Command.Empty class="empty">No results found</Command.Empty>
    {#each results as item (item.id)}
      <Command.Item value={item.id} onSelect={() => onSelect(item)} class="item">
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
      </Command.Item>
    {/each}
  </Command.List>
</Command.Root>
