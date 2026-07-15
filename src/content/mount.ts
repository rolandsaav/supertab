import { mount } from 'svelte';
import Shell from '../shell/Shell.svelte';
import styles from '../ui/app.css?inline';

export function mountApp(shadow: ShadowRoot): void {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  mount(Shell, { target: shadow });
}
