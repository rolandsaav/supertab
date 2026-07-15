<script lang="ts">
  interface Props {
    label: string;
  }

  let { label }: Props = $props();
</script>

<kbd class="key">{label}</kbd>
