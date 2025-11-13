import { dbHelpers } from './db';
import { CommandResult } from './types';

export type CommandHandler = (args: string[]) => Promise<CommandResult>;

export const commands: Record<string, CommandHandler> = {
  // Project commands
  'new': async (args: string[]): Promise<CommandResult> => {
    if (args.length === 0) {
      return {
        success: false,
        message: 'Usage: new project [name]'
      };
    }

    if (args[0] === 'project') {
      const projectName = args.slice(1).join(' ');
      if (!projectName) {
        return {
          success: false,
          message: 'Project name is required'
        };
      }

      const existing = await dbHelpers.getProjectByName(projectName);
      if (existing) {
        return {
          success: false,
          message: `Project "${projectName}" already exists`
        };
      }

      const project = await dbHelpers.createProject(projectName);
      return {
        success: true,
        message: `Created project: ${projectName}`,
        data: { project }
      };
    }

    return {
      success: false,
      message: 'Usage: new project [name]'
    };
  },

  'switch': async (args: string[]): Promise<CommandResult> => {
    const projectName = args.join(' ');
    if (!projectName) {
      return {
        success: false,
        message: 'Usage: switch [project name]'
      };
    }

    const project = await dbHelpers.getProjectByName(projectName);
    if (!project) {
      return {
        success: false,
        message: `Project "${projectName}" not found`
      };
    }

    return {
      success: true,
      message: `Switched to project: ${projectName}`,
      data: { project }
    };
  },

  'projects': async (): Promise<CommandResult> => {
    const projects = await dbHelpers.getProjects();
    if (projects.length === 0) {
      return {
        success: true,
        message: 'No projects yet. Create one with: new project [name]'
      };
    }

    const projectList = projects
      .map((p, i) => `[${i + 1}] ${p.name} (${p.tasksCompleted} tasks completed)`)
      .join('\n');

    return {
      success: true,
      message: `Your projects:\n${projectList}`,
      data: { projects }
    };
  },

  // Task commands
  'add': async (args: string[], context?: { currentProjectId?: string }): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project. Create or switch to a project first.'
      };
    }

    const description = args.join(' ');
    if (!description) {
      return {
        success: false,
        message: 'Usage: add [task description]'
      };
    }

    const task = await dbHelpers.createTask(context.currentProjectId, description);
    return {
      success: true,
      message: `Added task: ${description}`,
      data: { task }
    };
  },

  'tasks': async (args: string[], context?: { currentProjectId?: string }): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project. Create or switch to a project first.'
      };
    }

    const tasks = await dbHelpers.getTasks(context.currentProjectId);
    if (tasks.length === 0) {
      return {
        success: true,
        message: 'No pending tasks. Add one with: add [description]'
      };
    }

    const taskList = tasks
      .map((t, i) => `[${i + 1}] ${t.description}`)
      .join('\n');

    return {
      success: true,
      message: `Pending tasks:\n${taskList}`,
      data: { tasks }
    };
  },

  'complete': async (args: string[], context?: { currentProjectId?: string; tasks?: any[] }): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project.'
      };
    }

    const taskNum = parseInt(args[0]);
    if (isNaN(taskNum) || taskNum < 1) {
      return {
        success: false,
        message: 'Usage: complete [task number]'
      };
    }

    const tasks = await dbHelpers.getTasks(context.currentProjectId);
    if (taskNum > tasks.length) {
      return {
        success: false,
        message: `Task #${taskNum} not found`
      };
    }

    const task = tasks[taskNum - 1];
    const completedTask = await dbHelpers.completeTask(task.id);

    return {
      success: true,
      message: `Task completed: ${task.description}`,
      data: { task: completedTask, celebrate: true }
    };
  },

  // Stats
  'stats': async (): Promise<CommandResult> => {
    const totalTasks = await dbHelpers.getCompletedTasksCount();
    const projects = await dbHelpers.getProjects();
    const totalProjects = projects.length;
    const totalMinutes = totalTasks * 15;
    const totalHours = Math.floor(totalMinutes / 60);

    const stats = `
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
      message: stats,
      data: { totalTasks, totalProjects, totalMinutes }
    };
  },

  // Streak commands
  'streak': async (args: string[]): Promise<CommandResult> => {
    if (args[0] === 'with' && args[1]?.startsWith('@')) {
      const partnerName = args[1].substring(1);
      if (!partnerName) {
        return {
          success: false,
          message: 'Usage: streak with @[partner name]'
        };
      }

      const streak = await dbHelpers.createStreak(partnerName);
      return {
        success: true,
        message: `Started tracking streak with @${partnerName}`,
        data: { streak }
      };
    }

    const streaks = await dbHelpers.getStreaks();
    if (streaks.length === 0) {
      return {
        success: true,
        message: 'No streaks yet. Start one with: streak with @[name]'
      };
    }

    const streakList = streaks
      .map(s => `@${s.partnerName}: ${s.currentStreak} days (longest: ${s.longestStreak})`)
      .join('\n');

    return {
      success: true,
      message: `Your streaks:\n${streakList}`,
      data: { streaks }
    };
  },

  'share': async (args: string[], context?: { currentProjectId?: string }): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project.'
      };
    }

    // Format: share [task #] with @[person]
    const taskNum = parseInt(args[0]);
    if (isNaN(taskNum) || args[1] !== 'with' || !args[2]?.startsWith('@')) {
      return {
        success: false,
        message: 'Usage: share [task #] with @[person]'
      };
    }

    const tasks = await dbHelpers.getAllTasks(context.currentProjectId);
    if (taskNum > tasks.length) {
      return {
        success: false,
        message: `Task #${taskNum} not found`
      };
    }

    const task = tasks[taskNum - 1];
    const partnerName = args[2].substring(1);

    const sharedTask = await dbHelpers.shareTask(task.id, task.description, partnerName);

    return {
      success: true,
      message: `Shared "${task.description}" with @${partnerName}`,
      data: { sharedTask }
    };
  },

  // Help command
  'help': async (): Promise<CommandResult> => {
    const helpText = `
╔══════════════════════════════════════╗
║        15 MINUTES - COMMANDS         ║
╚══════════════════════════════════════╝

PROJECT MANAGEMENT:
  new project [name]        Create a new project
  switch [project]          Switch to a project
  projects                  List all projects

TASK MANAGEMENT:
  add [description]         Add a 15min task
  tasks                     List pending tasks
  complete [#]              Complete a task

COLLABORATION:
  streak with @[name]       Start a streak
  streak                    View streaks
  share [#] with @[name]    Share a task

OTHER:
  stats                     View statistics
  help                      Show this help
  clear                     Clear terminal

Pro tip: All tasks are 15 minutes. Stay focused!
`;

    return {
      success: true,
      message: helpText
    };
  },

  'clear': async (): Promise<CommandResult> => {
    return {
      success: true,
      message: '',
      data: { clear: true }
    };
  }
};

export async function executeCommand(
  input: string,
  context?: { currentProjectId?: string; tasks?: any[] }
): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      message: ''
    };
  }

  const parts = trimmed.split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = commands[commandName];
  if (!handler) {
    return {
      success: false,
      message: `Command not found: ${commandName}. Type 'help' for available commands.`
    };
  }

  try {
    return await handler(args, context);
  } catch (error) {
    return {
      success: false,
      message: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
