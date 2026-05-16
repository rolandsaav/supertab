import { writable } from 'svelte/store';

export const visible = writable(false);
export const tabs = writable([]);
export const query = writable('');
