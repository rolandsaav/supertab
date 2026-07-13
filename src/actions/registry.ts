import type { Component } from 'svelte';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import X from '@lucide/svelte/icons/x';
import Link from '@lucide/svelte/icons/link';
import Copy from '@lucide/svelte/icons/copy';
import type { Item, Kind } from '../search/parsers';
import { activateTab, closeTab, duplicateTab, openUrl } from '../bridge/background-bridge';

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
  shortcut?: Shortcut;
  after: 'close' | 'stay';
  /** Performs the verb only — never closes or refetches the palette. */
  run: (item: Item) => Promise<void>;
}

interface ActionGroup {
  primary: Action;
  secondary: Action[];
}

const REGISTRY: Partial<Record<Kind, ActionGroup>> = {
  tab: {
    primary: {
      id: 'activate',
      label: 'Activate',
      icon: ArrowRight,
      after: 'close',
      run: (item) => activateTab(item.id)
    },
    secondary: [
      {
        id: 'close',
        label: 'Close Tab',
        icon: X,
        shortcut: { mod: true, key: 'Backspace' },
        after: 'stay',
        run: (item) => closeTab(item.id)
      },
      {
        id: 'copy-url',
        label: 'Copy URL',
        icon: Link,
        shortcut: { mod: true, key: 'c' },
        after: 'stay',
        run: (item) => navigator.clipboard.writeText(item.url)
      },
      {
        id: 'duplicate',
        label: 'Duplicate Tab',
        icon: Copy,
        after: 'stay',
        run: (item) => duplicateTab(item.id)
      }
    ]
  },
  bookmark: {
    primary: {
      id: 'open',
      label: 'Open',
      icon: ArrowRight,
      after: 'close',
      run: (item) => openUrl(item.url)
    },
    secondary: []
  }
};

export function primaryAction(kind: Kind): Action | undefined {
  return REGISTRY[kind]?.primary;
}

export function actionsFor(kind: Kind): Action[] {
  const group = REGISTRY[kind];
  return group ? [group.primary, ...group.secondary] : [];
}
