import type { Command } from './command';
import { searchCommand } from '../modules/search/commands';

/** The root command list. Each module contributes its launch command here. */
export const COMMANDS: Command[] = [searchCommand];
