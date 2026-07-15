import RootList from './RootList.svelte';
import { COMMANDS } from '../commands/registry';
import type { Command } from '../commands/command';
import type { View } from './view';

/** One entry in the navigation stack: a view plus the title its header/back-button shows. */
export interface Frame {
  view: View;
  title: string;
}

/** The base view, always at the bottom of the stack. Not a registry command, so
 * the command list never lists itself. */
const ROOT: Frame = { view: RootList, title: 'SuperTab' };

class Nav {
  visible = $state(false);
  stack = $state<Frame[]>([ROOT]);

  get current(): Frame | undefined {
    return this.stack[this.stack.length - 1];
  }

  get canPop(): boolean {
    return this.stack.length > 1;
  }

  /**
   * Open the palette, seeding the stack. No target opens the root list. A command
   * id opens straight into that module with root left underneath, so Escape backs
   * out to it — unless `keepRoot` is false, where the module becomes the whole
   * stack and Escape closes.
   */
  open(target?: string, options: { keepRoot?: boolean } = {}): void {
    const keepRoot = options.keepRoot ?? true;
    this.stack = [ROOT];
    if (target) {
      const command = COMMANDS.find((candidate) => candidate.id === target);
      if (command) this.push(command);
    }
    if (!keepRoot && this.canPop) {
      this.stack = [this.stack[this.stack.length - 1]];
    }
    this.visible = true;
  }

  push<T>(command: Command<T>): void {
    if (command.run.kind === 'view') {
      this.stack = [...this.stack, { view: command.run.view, title: command.title }];
    }
  }

  pop(): void {
    if (this.canPop) {
      this.stack = this.stack.slice(0, -1);
    } else {
      this.close();
    }
  }

  close(): void {
    this.visible = false;
  }
}

export const nav = new Nav();
