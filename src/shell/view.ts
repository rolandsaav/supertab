import type { Component } from 'svelte';

/**
 * The Strategy the shell renders. A View is just a Svelte component — the whole
 * module contract. It takes no required props; it reaches navigation and the footer
 * through shell context, so any component conforms.
 */
export type View = Component;
