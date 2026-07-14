import type { Command } from '../commands/command';
import type { View } from './view';

/** One entry in the navigation stack: a view plus the title its header/back-button shows. */
export interface Frame {
  view: View;
  title: string;
}

class Nav {
  visible = $state(false);
  stack = $state<Frame[]>([]);

  get current(): Frame | undefined {
    return this.stack[this.stack.length - 1];
  }

  get canPop(): boolean {
    return this.stack.length > 1;
  }

  open(_target?: string, _opts: { keepRoot?: boolean } = {}): void {
    throw new Error('nav.open not implemented');
  }

  push(_command: Command): void {
    throw new Error('nav.push not implemented');
  }

  pop(): void {
    if (this.canPop) this.stack = this.stack.slice(0, -1);
    else this.close();
  }

  close(): void {
    this.visible = false;
  }
}

export const nav = new Nav();
