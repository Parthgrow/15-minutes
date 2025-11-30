import { dbHelpers } from './db';
import { CommandResult } from './types';

export interface CommandContext {
  currentProjectId?: string;
  tasks?: any[];
}

export type CommandHandler = (args: string[], context?: CommandContext) => Promise<CommandResult>;

export const commands: Record<string, CommandHandler> = {
  // Project commands
  'new': async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    if (args.length === 0) {
      return {
        success: false,
        message: 'Usage: new project [name] or new feature [name]'
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

    if (args[0] === 'feature') {
      if (!context?.currentProjectId) {
        return {
          success: false,
          message: 'No active project. Create or switch to a project first.'
        };
      }

      const featureName = args.slice(1).join(' ');
      if (!featureName) {
        return {
          success: false,
          message: 'Feature name is required'
        };
      }

      const existing = await dbHelpers.getFeatureByName(context.currentProjectId, featureName);
      if (existing) {
        return {
          success: false,
          message: `Feature "${featureName}" already exists in this project`
        };
      }

      const feature = await dbHelpers.createFeature(context.currentProjectId, featureName);
      const features = await dbHelpers.getFeatures(context.currentProjectId);
      const featureNumber = features.length; // 1-based index

      return {
        success: true,
        message: `Created feature #${featureNumber}: ${featureName}`,
        data: { feature }
      };
    }

    return {
      success: false,
      message: 'Usage: new project [name] or new feature [name]'
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

  // Feature commands
  'features': async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project. Create or switch to a project first.'
      };
    }

    const features = await dbHelpers.getFeatures(context.currentProjectId);
    if (features.length === 0) {
      return {
        success: true,
        message: 'No features yet. Create one with: new feature [name]'
      };
    }

    const featureList = features
      .map((f, i) => `[${i + 1}] ${f.name}`)
      .join('\n');

    return {
      success: true,
      message: `Your features:\n${featureList}`,
      data: { features }
    };
  },

  // Task commands
  'add': async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project. Create or switch to a project first.'
      };
    }

    // Parse: add task [description] [feature_id]
    if (args[0] !== 'task') {
      return {
        success: false,
        message: 'Usage: add task [description] [feature_id]'
      };
    }

    if (args.length < 3) {
      return {
        success: false,
        message: 'Usage: add task [description] [feature_id]\nExample: add task "implement login" 1'
      };
    }

    const featureIdNum = parseInt(args[args.length - 1]);
    if (isNaN(featureIdNum) || featureIdNum < 1) {
      return {
        success: false,
        message: 'Feature ID must be a positive number'
      };
    }

    const description = args.slice(1, -1).join(' ');
    if (!description) {
      return {
        success: false,
        message: 'Task description is required'
      };
    }

    // Get feature by index (1-based)
    const feature = await dbHelpers.getFeatureByIndex(context.currentProjectId, featureIdNum);
    if (!feature) {
      return {
        success: false,
        message: `Feature #${featureIdNum} not found. Use 'features' to see available features.`
      };
    }

    const task = await dbHelpers.createTask(context.currentProjectId, feature.id, description);
    
    // Calculate task number for display
    const tasksInFeature = await dbHelpers.getTasksByFeature(feature.id);
    const taskNumber = tasksInFeature.length;

    return {
      success: true,
      message: `Added task: ${description} (${featureIdNum}.${taskNumber})`,
      data: { task }
    };
  },

  'tasks': async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project. Create or switch to a project first.'
      };
    }

    const features = await dbHelpers.getFeatures(context.currentProjectId);
    if (features.length === 0) {
      return {
        success: true,
        message: 'No features yet. Create one with: new feature [name]'
      };
    }

    let hasAnyTasks = false;
    const featureSections: string[] = [];

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const featureNumber = i + 1;
      const tasks = await dbHelpers.getTasksByFeature(feature.id);

      if (tasks.length > 0) {
        hasAnyTasks = true;
        const taskList = tasks
          .map((t, taskIdx) => `  [${featureNumber}.${taskIdx + 1}] ${t.description}`)
          .join('\n');
        featureSections.push(`[${featureNumber}] ${feature.name}\n${taskList}`);
      } else {
        featureSections.push(`[${featureNumber}] ${feature.name} (no tasks)`);
      }
    }

    if (!hasAnyTasks) {
      return {
        success: true,
        message: 'No pending tasks. Add one with: add task [description] [feature_id]'
      };
    }

    return {
      success: true,
      message: `Pending tasks:\n${featureSections.join('\n\n')}`,
      data: { features, tasks: await dbHelpers.getTasksByProject(context.currentProjectId) }
    };
  },

  'complete': async (args: string[], context?: CommandContext): Promise<CommandResult> => {
    if (!context?.currentProjectId) {
      return {
        success: false,
        message: 'No active project.'
      };
    }

    // Parse task number in format: feature.task (e.g., "1.2" or "1.1")
    const taskIdentifier = args[0];
    if (!taskIdentifier) {
      return {
        success: false,
        message: 'Usage: complete [feature.task] (e.g., complete 1.2)'
      };
    }

    const parts = taskIdentifier.split('.');
    if (parts.length !== 2) {
      return {
        success: false,
        message: 'Usage: complete [feature.task] (e.g., complete 1.2)'
      };
    }

    const featureNum = parseInt(parts[0]);
    const taskNum = parseInt(parts[1]);

    if (isNaN(featureNum) || isNaN(taskNum) || featureNum < 1 || taskNum < 1) {
      return {
        success: false,
        message: 'Invalid task number. Use format: feature.task (e.g., 1.2)'
      };
    }

    // Get feature by index
    const feature = await dbHelpers.getFeatureByIndex(context.currentProjectId, featureNum);
    if (!feature) {
      return {
        success: false,
        message: `Feature #${featureNum} not found`
      };
    }

    // Get tasks for this feature
    const tasks = await dbHelpers.getTasksByFeature(feature.id);
    if (taskNum > tasks.length) {
      return {
        success: false,
        message: `Task ${featureNum}.${taskNum} not found`
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

  'share': async (args: string[], context?: CommandContext): Promise<CommandResult> => {
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

FEATURE MANAGEMENT:
  new feature [name]        Create a feature in current project
  features                  List all features in current project

TASK MANAGEMENT:
  add task [desc] [id]      Add a 15min task to a feature
                            Example: add task "implement login" 1
  tasks                     List pending tasks (grouped by feature)
  complete [feature.task]   Complete a task
                            Example: complete 1.2

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
  context?: CommandContext
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
