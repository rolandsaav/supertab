<script lang="ts">
  import type { Command } from '../commands/command';
  let { command }: { command: Command } = $props();
  const Icon = $derived(command.icon);
</script>

<Icon size={16} />
<div class="text">
  <div class="title">{command.title}</div>
</div>
