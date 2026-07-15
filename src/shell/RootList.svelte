<script lang="ts">
  import ListView from '../components/ListView.svelte';
  import { COMMANDS } from '../commands/registry';
  import type { Command } from '../commands/command';

  function textFor(command: Command): string {
    return [command.title, ...(command.keywords ?? [])].join(' ');
  }

  // A root command acts on nothing, so selecting its row just invokes it. Re-express
  // it as an action on the selected command so ListView can run every row uniformly.
  function actionsFor(command: Command): Command<Command>[] {
    if (command.run.kind === 'view') return [{ ...command, run: command.run }];
    const { perform, after } = command.run;
    return [{ ...command, run: { kind: 'perform', perform: () => perform(), after } }];
  }
</script>

<ListView
  items={COMMANDS}
  getId={(command) => command.id}
  getText={textFor}
  placeholder="Search for commands…"
  commands={actionsFor}
>
  {#snippet item(command)}
    {@const Icon = command.icon}
    <Icon size={16} />
    <div class="text">
      <div class="title">{command.title}</div>
    </div>
  {/snippet}
</ListView>
