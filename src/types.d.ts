/** Vite `?inline` CSS imports resolve to the stylesheet as a string. */
declare module '*.css?inline' {
  const css: string;
  export default css;
}
