import { defineConfig } from 'vite';

/** @type {import('vite').UserConfig} */
export default defineConfig({
  build: {
    lib: {
      entry: 'src/background/background.ts',
      name: 'SuperTabBackground',
      formats: ['iife'],
      fileName: () => 'background.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      $lib: '/src',
    },
  },
});
