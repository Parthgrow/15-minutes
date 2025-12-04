import { dbHelpers } from '../db';
import { CommandResult } from '../types';
import { CommandContext } from './types';

// new project [name] - Create a new project
export async function newProject(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  const projectName = args.join(' ');
  if (!projectName) {
    return {
      success: false,
      message: 'Project name is required',
    };
  }

  const existing = await dbHelpers.getProjectByName(projectName);
  if (existing) {
    return {
      success: false,
      message: `Project "${projectName}" already exists`,
    };
  }

  const project = await dbHelpers.createProject(projectName);
  return {
    success: true,
    message: `Created project: ${projectName}`,
    data: { project },
  };
}

// switch [project] - Switch to a project
export async function switchProject(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  const projectName = args.join(' ');
  if (!projectName) {
    return {
      success: false,
      message: 'Usage: switch [project name]',
    };
  }

  const project = await dbHelpers.getProjectByName(projectName);
  if (!project) {
    return {
      success: false,
      message: `Project "${projectName}" not found`,
    };
  }

  return {
    success: true,
    message: `Switched to project: ${projectName}`,
    data: { project },
  };
}

// projects - List all projects
export async function listProjects(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  const projects = await dbHelpers.getProjects();
  if (projects.length === 0) {
    return {
      success: true,
      message: 'No projects yet. Create one with: new project [name]',
    };
  }

  const projectList = projects
    .map((p, i) => `[${i + 1}] ${p.name} (${p.tasksCompleted} tasks completed)`)
    .join('\n');

  return {
    success: true,
    message: `Your projects:\n${projectList}`,
    data: { projects },
  };
}
