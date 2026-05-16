import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Inline CSS into the emitted JS so we can physically inject it
    // into the Shadow DOM at runtime rather than letting Vite extract
    // a separate stylesheet.
    css: 'injected'
  }
};
