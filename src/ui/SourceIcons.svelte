<script lang="ts">
  import { SOURCE_META, SOURCE_ORDER } from './sources';
  import type { Kind, SourceToggles } from '../search/parsers';

  interface Props {
    enabled: SourceToggles;
    onToggle: (kind: Kind) => void;
  }

  let { enabled, onToggle }: Props = $props();
</script>

<div class="sources">
  {#each SOURCE_ORDER as kind (kind)}
    {@const Icon = SOURCE_META[kind].icon}
    <button
      type="button"
      class="source"
      class:enabled={enabled[kind]}
      aria-pressed={enabled[kind]}
      title={SOURCE_META[kind].label}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => onToggle(kind)}
    >
      <Icon />
    </button>
  {/each}
</div>
