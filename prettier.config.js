/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
  plugins: ['prettier-plugin-svelte'],
  overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
};
