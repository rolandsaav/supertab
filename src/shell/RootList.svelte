<script lang="ts">
  import List from './list/List.svelte';
  import ListItem from './list/ListItem.svelte';
  import CommandRow from './CommandRow.svelte';
  import { COMMANDS } from '../commands/registry';
  import { order } from '../lib/fuzzy';
  import type { Command } from '../commands/command';

  let query = $state('');

  function textFor(command: Command): string {
    return [command.title, ...(command.keywords ?? [])].join(' ');
  }

  const visible = $derived.by(() => {
    if (!query.trim()) return COMMANDS;
    return order(COMMANDS.map(textFor), query).map((index) => COMMANDS[index]);
  });
</script>

<List bind:query placeholder="Search for commands…">
  {#each visible as command (command.id)}
    <ListItem id={command.id} actions={{ primary: command }}>
      <CommandRow {command} />
    </ListItem>
  {/each}
</List>
