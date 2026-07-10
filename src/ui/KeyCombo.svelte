<script lang="ts">
  import Key from './Key.svelte';
  import { shortcutParts } from './utils.svelte';
  import type { Shortcut } from '../actions/registry';

  interface Props {
    shortcut: Shortcut;
  }

  let { shortcut }: Props = $props();
</script>

{#each shortcutParts(shortcut) as part}
  <Key label={part} />
{/each}
