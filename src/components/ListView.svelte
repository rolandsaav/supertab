<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { Command } from '../commands/command';

  interface Props {
    items: T[];
    getId: (item: T) => string;
    placeholder: string;
    commands: (item: T) => Command<T>[];
    item: Snippet<[T]>;
    header?: Snippet;
    isLoading?: boolean;
    onQuery?: (query: string) => void;
    onRefresh?: () => void;
  }

  let props: Props = $props();
</script>

<!-- Contract only — rendering, keyboard nav, actions panel, and footer land later. -->
<div class="list-view">
  {#each props.items as entry (props.getId(entry))}
    {@render props.item(entry)}
  {/each}
</div>
