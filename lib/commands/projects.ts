import { CommandResult, Project } from '../types';
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

  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName }),
  });
  const project = await res.json();

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

  // Find project by name
  const projectsRes = await fetch('/api/projects');
  const projects: Project[] = await projectsRes.json();
  const project = projects.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );

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

// delete project - Delete the current project and all its features/tasks
export async function deleteProject(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  if (!context?.currentProjectId) {
    return {
      success: false,
      message: 'No active project. Switch to a project first.',
    };
  }

  const res = await fetch(`/api/projects/${context.currentProjectId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json();
    return { success: false, message: err.error ?? 'Failed to delete project' };
  }

  return {
    success: true,
    message: 'Project deleted.',
    data: { deletedProjectId: context.currentProjectId },
  };
}

// projects - List all projects
export async function listProjects(
  args: string[],
  context?: CommandContext
): Promise<CommandResult> {
  const projectsRes = await fetch('/api/projects');
  const projects: Project[] = await projectsRes.json();

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
