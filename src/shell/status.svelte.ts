/** A transient error surfaced under the palette. Set by whatever failed (a command
 * or a query), shown by the shell. A rune singleton, like the footer. */
export const status: { error: string } = $state({ error: '' });

/** Turn an unknown thrown value into a message string. */
export function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
