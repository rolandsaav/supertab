<script lang="ts">
  import KeyCombo from './KeyCombo.svelte';
  import { OPEN_ACTIONS_SHORTCUT, PRIMARY_SHORTCUT } from './utils.svelte';

  interface Props {
    primaryLabel?: string;
    hasActions?: boolean;
  }

  let { primaryLabel, hasActions = false }: Props = $props();
</script>

<div class="footer">
  {#if primaryLabel}
    <span class="hint hint-primary">{primaryLabel}<KeyCombo shortcut={PRIMARY_SHORTCUT} /></span>
  {/if}
  {#if primaryLabel && hasActions}
    <span class="divider" aria-hidden="true"></span>
  {/if}
  {#if hasActions}
    <span class="hint hint-actions">
      Actions
      <KeyCombo shortcut={OPEN_ACTIONS_SHORTCUT} />
    </span>
  {/if}
</div>
