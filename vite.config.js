import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: 'src/content/content.ts',
      name: 'SuperTabContent',
      formats: ['iife'],
      fileName: () => 'content.js'
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: true
  },
  resolve: {
    alias: {
      $lib: '/src'
    }
  }
});
