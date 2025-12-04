import { dbHelpers } from '../db';
import { CommandResult } from '../types';
import { CommandContext } from './types';
import { newProject } from './projects';
import { newFeature } from './features';
import { addTask } from './tasks';

// new project [name] or new feature [name]
export async function newCommand(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (args.length === 0) {
    return {
      success: false,
      message: 'Usage: new project [name] or new feature [name]',
    };
  }

  if (args[0] === 'project') {
    return newProject(args.slice(1), context);
  }

  if (args[0] === 'feature') {
    return newFeature(args.slice(1), context);
  }

  return {
    success: false,
    message: 'Usage: new project [name] or new feature [name]',
  };
}

// add task [description] [feature_id]
export async function addCommand(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (args[0] !== 'task') {
    return {
      success: false,
      message: 'Usage: add task [description] [feature_id]',
    };
  }
  return addTask(args.slice(1), context);
}

// stats - Show statistics
export async function stats(): Promise<CommandResult> {
  const totalTasks = await dbHelpers.getCompletedTasksCount();
  const projects = await dbHelpers.getProjects();
  const totalProjects = projects.length;
  const totalMinutes = totalTasks * 15;
  const totalHours = Math.floor(totalMinutes / 60);

  const statsMessage = `
╔══════════════════════════════════════╗
║          YOUR STATISTICS             ║
╚══════════════════════════════════════╝

Total Projects: ${totalProjects}
Total Tasks Completed: ${totalTasks}
Total Time Invested: ${totalHours}h ${totalMinutes % 60}m
Jelly Beans Earned: ${totalTasks}
`;

  return {
    success: true,
    message: statsMessage,
    data: { totalTasks, totalProjects, totalMinutes },
  };
}

// help - Show help text
export async function help(): Promise<CommandResult> {
  const helpText = `
╔══════════════════════════════════════╗
║        15 MINUTES - COMMANDS         ║
╚══════════════════════════════════════╝

PROJECT MANAGEMENT:
  new project [name]        Create a new project
  switch [project]          Switch to a project
  projects                  List all projects

FEATURE MANAGEMENT:
  new feature [name]        Create a feature in current project
  features                  List all features in current project

TASK MANAGEMENT:
  add task [desc] [id]      Add a 15min task to a feature
                            Example: add task "implement login" 1
  tasks                     List pending tasks (grouped by feature)
  complete [feature.task]   Complete a task
                            Example: complete 1.2

OTHER:
  stats                     View statistics
  help                      Show this help
  clear                     Clear terminal

Pro tip: All tasks are 15 minutes. Stay focused!
`;

  return {
    success: true,
    message: helpText,
  };
}

// clear - Clear terminal
export async function clear(): Promise<CommandResult> {
  return {
    success: true,
    message: '',
    data: { clear: true },
  };
}
