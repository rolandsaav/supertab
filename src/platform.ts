/** True on macOS, where the command modifier is ⌘ (metaKey) rather than Ctrl. */
export const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
