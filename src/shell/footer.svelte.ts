/** What the shell's footer shows for the active view. A rune singleton the active
 * view mutates and the shell reads. */
export interface FooterState {
  primaryLabel?: string;
  hasActions: boolean;
}

export const footer: FooterState = $state({ hasActions: false });
