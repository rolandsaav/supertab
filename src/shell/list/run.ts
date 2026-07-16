import { nav } from '../nav.svelte';
import { status, toMessage } from '../status.svelte';
import type { Command } from '../../commands/command';

/** Run a command against its subject: push a view, or perform an effect and then
 * close or refresh. Failures surface through the shared status. */
export async function runCommand<T>(
  command: Command<T>,
  subject: T,
  onRefresh?: () => void
): Promise<void> {
  status.error = '';
  if (command.run.kind === 'view') {
    nav.push(command);
    return;
  }
  try {
    await command.run.perform(subject);
  } catch (e) {
    status.error = toMessage(e, 'Action failed');
    return;
  }
  if (command.run.after === 'stay') onRefresh?.();
  else nav.close();
}
