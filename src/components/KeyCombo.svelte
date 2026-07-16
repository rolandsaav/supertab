<script lang="ts">
  import Key from './Key.svelte';
  import { shortcutParts } from './utils.svelte';
  import type { Shortcut } from '../commands/command';

  interface Props {
    shortcut: Shortcut;
  }

  let { shortcut }: Props = $props();
</script>

{#each shortcutParts(shortcut) as part (part)}
  <Key label={part} />
{/each}
