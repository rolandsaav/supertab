import type { Shortcut } from '../actions/registry';

/** True on macOS, where the command modifier is ⌘ (metaKey) rather than Ctrl. */
export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const KEY_LABELS: Record<string, string> = { enter: '↵' };

/** Render a Shortcut as a platform-appropriate display string (⌘W / Ctrl+W). */
export function formatShortcut(s: Shortcut): string {
  const parts: string[] = [];
  if (s.mod) parts.push(isMac ? '⌘' : 'Ctrl');
  if (s.shift) parts.push(isMac ? '⇧' : 'Shift');
  parts.push(KEY_LABELS[s.key.toLowerCase()] ?? s.key.toUpperCase());
  return isMac ? parts.join('') : parts.join('+');
}

/** The keystroke that opens the actions panel: ⌘↵ on macOS, Ctrl+↵ elsewhere. */
export const OPEN_ACTIONS_SHORTCUT: Shortcut = { mod: true, key: 'Enter' };

/** Whether a keyboard event matches a canonical Shortcut on the current platform. */
export function matchesShortcut(e: KeyboardEvent, s: Shortcut): boolean {
  const mod = isMac ? e.metaKey : e.ctrlKey;
  return (
    e.key.toLowerCase() === s.key.toLowerCase() &&
    !!s.mod === mod &&
    !!s.shift === e.shiftKey
  );
}

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
