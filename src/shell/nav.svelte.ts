import type { Command } from '../commands/command';
import type { View } from './view';

/** One entry in the navigation stack: a view plus the title its header/back-button shows. */
export interface Frame {
  view: View;
  title: string;
}

/**
 * The navigation store. Kept as a leaf — it imports nothing from the view tree,
 * so views can import it directly (Svelte 5 module state). The root view is
 * injected via `setRoot`, and `open` takes a resolved `Command`, so nav never
 * needs the registry or the root component.
 */
class Nav {
  visible = $state(false);
  stack = $state<Frame[]>([]);

  #root: Frame | null = null;
  #escapeInterceptor: (() => boolean) | null = null;

  /** Set the base view once, at startup. Not a registry command, so the command
   * list never lists itself. */
  setRoot(frame: Frame): void {
    this.#root = frame;
    if (this.stack.length === 0) this.stack = [frame];
  }

  get current(): Frame | undefined {
    return this.stack[this.stack.length - 1];
  }

  get canPop(): boolean {
    return this.stack.length > 1;
  }

  /**
   * Open the palette, seeding the stack. No command opens the root list. A command
   * opens straight into it with root left underneath, so Escape backs out — unless
   * `keepRoot` is false, where the command becomes the whole stack and Escape closes.
   */
  open(command?: Command, options: { keepRoot?: boolean } = {}): void {
    const keepRoot = options.keepRoot ?? true;
    this.stack = this.#root ? [this.#root] : [];
    if (command) this.push(command);
    if (!keepRoot && this.canPop) {
      this.stack = [this.stack[this.stack.length - 1]];
    }
    this.visible = true;
  }

  push<T>(command: Command<T>): void {
    if (command.run.kind === 'view') {
      this.stack = [
        ...this.stack,
        { view: command.run.view, title: command.title },
      ];
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

  setEscapeInterceptor(handler: (() => boolean) | null): void {
    this.#escapeInterceptor = handler;
  }

  /** Step back on Escape, unless the active view consumes it first. */
  escape(): void {
    if (this.#escapeInterceptor?.()) return;
    this.pop();
  }
}

export const nav = new Nav();
