import type { Component } from 'svelte';
import type { Command, Shortcut } from './command';
import type { View } from '../shell/view';

/** A perform command: run an effect on the subject, then close (default) or stay. */
export function action<T>(o: {
  id: string;
  title: string;
  icon: Component;
  shortcut?: Shortcut;
  do: (subject: T) => Promise<void>;
  after?: 'close' | 'stay';
}): Command<T> {
  return {
    id: o.id,
    title: o.title,
    icon: o.icon,
    shortcut: o.shortcut,
    run: { kind: 'perform', perform: o.do, after: o.after ?? 'close' },
  };
}

/** A view command: push a view onto the nav stack. */
export function openView(o: {
  id: string;
  title: string;
  icon: Component;
  keywords?: string[];
  view: View;
}): Command {
  return {
    id: o.id,
    title: o.title,
    icon: o.icon,
    keywords: o.keywords,
    run: { kind: 'view', view: o.view },
  };
}
