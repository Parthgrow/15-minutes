import { CommandResult, Feature, Task } from '../types';
import { CommandContext } from './types';

// add task [description] [feature_id] [--30] - Add a task to a feature
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

  // Detect and strip --30 flag
  const has30Flag = args.includes('--30');
  const filteredArgs = args.filter((a) => a !== '--30');
  const duration = has30Flag ? 30 : 15;

  if (filteredArgs.length < 2) {
    return {
      success: false,
      message:
        'Usage: add task [description] [feature_id]\nExample: add task "implement login" 1',
    };
  }

  const featureIdNum = parseInt(filteredArgs[filteredArgs.length - 1]);
  if (isNaN(featureIdNum) || featureIdNum < 1) {
    return {
      success: false,
      message: 'Feature ID must be a positive number',
    };
  }

  const description = filteredArgs.slice(0, -1).join(' ');
  if (!description) {
    return {
      success: false,
      message: 'Task description is required',
    };
  }

  // Get feature by index (1-based)
  const featuresRes = await fetch(
    `/api/features?projectId=${context.currentProjectId}`
  );
  const features: Feature[] = await featuresRes.json();
  const feature = features[featureIdNum - 1];

  if (!feature) {
    return {
      success: false,
      message: `Feature #${featureIdNum} not found. Use 'features' to see available features.`,
    };
  }

  // Create task
  const createRes = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: context.currentProjectId,
      featureId: feature.id,
      description,
      duration,
    }),
  });
  const task = await createRes.json();

  // Get task count for numbering
  const tasksRes = await fetch(`/api/tasks?featureId=${feature.id}`);
  const tasksInFeature: Task[] = await tasksRes.json();
  const taskNumber = tasksInFeature.length;

  return {
    success: true,
    message: `Added task: ${description} (${featureIdNum}.${taskNumber}) [${duration}min]`,
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

  const featuresRes = await fetch(
    `/api/features?projectId=${context.currentProjectId}`
  );
  const features: Feature[] = await featuresRes.json();

  if (features.length === 0) {
    return {
      success: true,
      message: 'No features yet. Create one with: new feature [name]',
    };
  }

  let hasAnyTasks = false;
  const featureSections: string[] = [];
  const allTasks: Task[] = [];

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const featureNumber = i + 1;

    const tasksRes = await fetch(`/api/tasks?featureId=${feature.id}`);
    const tasks: Task[] = await tasksRes.json();
    allTasks.push(...tasks);

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
      tasks: allTasks,
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

  // Get feature by index
  const featuresRes = await fetch(
    `/api/features?projectId=${context.currentProjectId}`
  );
  const features: Feature[] = await featuresRes.json();
  const feature = features[featureNum - 1];

  if (!feature) {
    return {
      success: false,
      message: `Feature #${featureNum} not found`,
    };
  }

  // Get tasks for this feature
  const tasksRes = await fetch(`/api/tasks?featureId=${feature.id}`);
  const tasks: Task[] = await tasksRes.json();

  if (taskNum > tasks.length) {
    return {
      success: false,
      message: `Task ${featureNum}.${taskNum} not found`,
    };
  }

  const task = tasks[taskNum - 1];

  // Mark task as complete
  const completeRes = await fetch(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true }),
  });
  const completedTask = await completeRes.json();

  return {
    success: true,
    message: `Task completed: ${task.description}`,
    data: { task: completedTask, celebrate: true },
  };
}
