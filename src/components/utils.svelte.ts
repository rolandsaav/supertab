import type { Command, Shortcut } from '../commands/command';

/** True on macOS, where the command modifier is ⌘ (metaKey) rather than Ctrl. */
export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

const KEY_LABELS: Record<string, string> = { enter: '↵', backspace: '⌫' };

/** A Shortcut as its individual key glyphs, e.g. ['⌘', '↵'] — for keycap rendering. */
export function shortcutParts(s: Shortcut): string[] {
  const parts: string[] = [];
  if (s.mod) parts.push(isMac ? '⌘' : 'Ctrl');
  if (s.shift) parts.push(isMac ? '⇧' : 'Shift');
  parts.push(KEY_LABELS[s.key.toLowerCase()] ?? s.key.toUpperCase());
  return parts;
}

/** The keystroke that runs an item's primary action. */
export const PRIMARY_SHORTCUT: Shortcut = { key: 'Enter' };

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

/** The first action whose shortcut matches the event, if any. */
export function matchAction<T>(
  e: KeyboardEvent,
  actions: Command<T>[],
): Command<T> | undefined {
  return actions.find((a) => a.shortcut && matchesShortcut(e, a.shortcut));
}

/**
 * Move the Command list highlight on Tab / Shift+Tab. Delegates to bits-ui's own
 * `updateSelectedByItem` (the method its arrow keys use), so it wraps with `loop`,
 * skips disabled rows, and scrolls the selection into view — no synthetic events.
 */
export function tabNav(
  e: KeyboardEvent,
  command: { updateSelectedByItem: (change: number) => void } | null,
): void {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  command?.updateSelectedByItem(e.shiftKey ? -1 : 1);
}

/** Focus the input on mount and whenever `shouldFocus()` becomes true. */
export function autofocus(
  input: () => HTMLInputElement | null,
  shouldFocus: () => boolean = () => true,
): void {
  $effect(() => {
    if (shouldFocus() && input()) {
      requestAnimationFrame(() => input()?.focus());
    }
  });
}
