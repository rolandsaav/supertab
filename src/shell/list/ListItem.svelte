<script lang="ts" generics="T">
  import { Command } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import { getListContext, type RowActions } from './context';

  interface Props {
    id: string;
    actions: RowActions<T>;
    /** Value passed to an action's perform; omit for void/root commands. */
    subject?: T;
    children: Snippet;
  }
  let { id, actions, subject, children }: Props = $props();
  const ctx = getListContext();

  $effect(() => {
    ctx.register(id, { subject, actions });
    return () => ctx.unregister(id);
  });
</script>

<Command.Item
  value={id}
  onSelect={() => ctx.select(id)}
  oncontextmenu={(e) => {
    e.preventDefault();
    ctx.openActions(id);
  }}
  class="item"
>
  {@render children()}
</Command.Item>
