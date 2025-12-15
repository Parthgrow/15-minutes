import { CommandResult } from '../types';
import { CommandContext, CommandHandler } from './types';

// Project commands
import { newProject, switchProject, listProjects } from './projects';

// Feature commands
import { newFeature, listFeatures } from './features';

// Task commands
import { addTask, listTasks, completeTask } from './tasks';

// Core commands
import { newCommand, addCommand, stats, help, clear } from './core';

// Export types
export type { CommandContext, CommandHandler };

// Export all commands as a record
export const commands: Record<string, CommandHandler> = {
  new: newCommand,
  switch: switchProject,
  projects: listProjects,
  features: listFeatures,
  add: addCommand,
  tasks: listTasks,
  complete: completeTask,
  stats,
  help,
  clear,
};

// Execute a command
export async function executeCommand(
  input: string,
  context?: CommandContext
): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      message: '',
    };
  }

  const parts = trimmed.split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = commands[commandName];
  if (!handler) {
    return {
      success: false,
      message: `Command not found: ${commandName}. Type 'help' for available commands.`,
    };
  }

  try {
    return await handler(args, context);
  } catch (error) {
    return {
      success: false,
      message: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
