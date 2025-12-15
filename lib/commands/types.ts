import { CommandResult } from '../types';

export interface CommandContext {
  currentProjectId?: string;
  tasks?: any[];
}

export type CommandHandler = (
  args: string[],
  context?: CommandContext
) => Promise<CommandResult>;
