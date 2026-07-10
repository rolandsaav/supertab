import type { Component } from 'svelte';
import type { Item, Kind } from '../search/parsers';

/**
 * A keystroke stored structurally, not as a display string, so it can be both
 * matched and formatted per-platform. `mod` is the command modifier: ⌘ on
 * macOS, Ctrl elsewhere.
 */
export type Shortcut = {
  mod?: boolean;
  shift?: boolean;
  key: string;
};

export interface Action {
  id: string;
  label: string;
  icon: Component;
  kinds: Kind[];
  shortcut?: Shortcut;
  after: 'close' | 'stay';
  /** Performs the verb only — never closes or refetches the palette. */
  run: (item: Item) => Promise<void>;
}

/** Array order is priority: the first action applicable to a kind is primary. */
const ACTIONS: Action[] = [];

export function actionsFor(kind: Kind): Action[] {
  return ACTIONS.filter((a) => a.kinds.includes(kind));
}

export function primaryAction(kind: Kind): Action {
  return actionsFor(kind)[0];
}

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function formatShortcut(s: Shortcut): string {
  const parts: string[] = [];
  if (s.mod) parts.push(IS_MAC ? '⌘' : 'Ctrl');
  if (s.shift) parts.push(IS_MAC ? '⇧' : 'Shift');
  parts.push(s.key.toUpperCase());
  return IS_MAC ? parts.join('') : parts.join('+');
}
