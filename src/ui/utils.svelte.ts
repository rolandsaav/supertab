/** Translate Tab / Shift+Tab into ↑/↓ on the given input, for Command lists. */
export function tabNav(e: KeyboardEvent, input: HTMLInputElement | null): void {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  input?.dispatchEvent(
    new KeyboardEvent('keydown', { key: e.shiftKey ? 'ArrowUp' : 'ArrowDown', bubbles: true })
  );
}

/** Focus the input on mount and whenever `shouldFocus()` becomes true. */
export function autofocus(
  input: () => HTMLInputElement | null,
  shouldFocus: () => boolean = () => true
): void {
  $effect(() => {
    if (shouldFocus() && input()) {
      requestAnimationFrame(() => input()?.focus());
    }
  });
}
