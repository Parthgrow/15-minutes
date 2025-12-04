import { dbHelpers } from '../db';
import { CommandResult } from '../types';
import { CommandContext } from './types';

// add task [description] [feature_id] - Add a task to a feature
export async function addTask(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project. Create or switch to a project first.',
    };
  }

  if (args.length < 2) {
    return {
      success: false,
      message:
        'Usage: add task [description] [feature_id]\nExample: add task "implement login" 1',
    };
  }

  const featureIdNum = parseInt(args[args.length - 1]);
  if (isNaN(featureIdNum) || featureIdNum < 1) {
    return {
      success: false,
      message: 'Feature ID must be a positive number',
    };
  }

  const description = args.slice(0, -1).join(' ');
  if (!description) {
    return {
      success: false,
      message: 'Task description is required',
    };
  }

  const feature = await dbHelpers.getFeatureByIndex(
    context.currentProjectId,
    featureIdNum
  );
  if (!feature) {
    return {
      success: false,
      message: `Feature #${featureIdNum} not found. Use 'features' to see available features.`,
    };
  }

  const task = await dbHelpers.createTask(
    context.currentProjectId,
    feature.id,
    description
  );

  const tasksInFeature = await dbHelpers.getTasksByFeature(feature.id);
  const taskNumber = tasksInFeature.length;

  return {
    success: true,
    message: `Added task: ${description} (${featureIdNum}.${taskNumber})`,
    data: { task },
  };
}

// tasks - List all pending tasks grouped by feature
export async function listTasks(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project. Create or switch to a project first.',
    };
  }

  const features = await dbHelpers.getFeatures(context.currentProjectId);
  if (features.length === 0) {
    return {
      success: true,
      message: 'No features yet. Create one with: new feature [name]',
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
      message: 'No pending tasks. Add one with: add task [description] [feature_id]',
    };
  }

  return {
    success: true,
    message: `Pending tasks:\n${featureSections.join('\n\n')}`,
    data: {
      features,
      tasks: await dbHelpers.getTasksByProject(context.currentProjectId),
    },
  };
}

// complete [feature.task] - Complete a task
export async function completeTask(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project.',
    };
  }

  const taskIdentifier = args[0];
  if (!taskIdentifier) {
    return {
      success: false,
      message: 'Usage: complete [feature.task] (e.g., complete 1.2)',
    };
  }

  const parts = taskIdentifier.split('.');
  if (parts.length !== 2) {
    return {
      success: false,
      message: 'Usage: complete [feature.task] (e.g., complete 1.2)',
    };
  }

  const featureNum = parseInt(parts[0]);
  const taskNum = parseInt(parts[1]);

  if (isNaN(featureNum) || isNaN(taskNum) || featureNum < 1 || taskNum < 1) {
    return {
      success: false,
      message: 'Invalid task number. Use format: feature.task (e.g., 1.2)',
    };
  }

  const feature = await dbHelpers.getFeatureByIndex(
    context.currentProjectId,
    featureNum
  );
  if (!feature) {
    return {
      success: false,
      message: `Feature #${featureNum} not found`,
    };
  }

  const tasks = await dbHelpers.getTasksByFeature(feature.id);
  if (taskNum > tasks.length) {
    return {
      success: false,
      message: `Task ${featureNum}.${taskNum} not found`,
    };
  }

  const task = tasks[taskNum - 1];
  const completedTask = await dbHelpers.completeTask(task.id);

  return {
    success: true,
    message: `Task completed: ${task.description}`,
    data: { task: completedTask, celebrate: true },
  };
}
