import { mount } from 'svelte';
import App from '../ui/App.svelte';
import styles from '../ui/app.css?inline';

export function mountApp(shadow: ShadowRoot): void {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  mount(App, { target: shadow });
}
