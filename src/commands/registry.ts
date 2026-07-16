import type { Command } from './command';
import { searchCommand } from '../modules/search/commands';
import { downloadsCommand } from '../modules/downloads/commands';

/** The root command list. Each module contributes its launch command here. */
export const COMMANDS: Command[] = [searchCommand, downloadsCommand];
