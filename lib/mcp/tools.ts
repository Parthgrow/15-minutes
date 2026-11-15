import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createFeature, deleteFeature, getFeature, listFeatures } from '@/lib/data/features';
import { createProject, deleteProject, getProject, listProjects } from '@/lib/data/projects';
import { getStats, getTimeline } from '@/lib/data/stats';
import {
  StoredTask,
  TaskUpdateError,
  createTask,
  deleteTask,
  getTask,
  listAllTasks,
  setTaskCompleted,
  updateTask,
} from '@/lib/data/tasks';
import { getUser } from '@/lib/data/users';
import { computeStreak } from '@/lib/streak';
import { Feature, Project } from '@/lib/types';

// Transport-agnostic: the local stdio server (scripts/mcp-server.ts) and the
// remote routes (app/api/mcp) both call this with the userId they've
// authenticated. All storage goes through lib/data, the same layer the web
// app's API routes use, so changes show up in the app immediately.

const duration = z
  .union([z.literal(15), z.literal(30)])
  .describe('Length in minutes: 15 (one block, the default) or 30 (two blocks).');

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

function error(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

// Stored timestamps are epoch ms; tools speak YYYY-MM-DD (UTC, like the stats)
const day = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : null);

function presentProject(p: Project) {
  return {
    id: p.id,
    name: p.name,
    tasksCompleted: p.tasksCompleted ?? 0,
    minutesFocused: p.totalMinutes ?? 0,
    createdDate: day(p.createdAt),
  };
}

function presentFeature(f: Feature) {
  return {
    id: f.id,
    projectId: f.projectId,
    name: f.name,
    tasksCompleted: f.tasksCompleted ?? 0,
    createdDate: day(f.createdAt),
  };
}

function presentTask(t: StoredTask, names?: { feature?: string; project?: string }) {
  return {
    id: t.id,
    description: t.description,
    duration: t.duration ?? 15,
    completed: t.completedAt !== null,
    completedDate: t.completedDate ?? day(t.completedAt),
    createdDate: day(t.createdAt),
    featureId: t.featureId,
    projectId: t.projectId,
    ...(names?.feature ? { feature: names.feature } : {}),
    ...(names?.project ? { project: names.project } : {}),
  };
}

export function registerTools(server: McpServer, userId: string) {
  server.registerTool(
    'whoami',
    {
      description: 'Show which 15 Minutes account these tools are acting as.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const user = await getUser(userId);
      return json({ userId, name: user?.name ?? null, email: user?.email ?? null });
    }
  );

  // Projects

  server.registerTool(
    'list_projects',
    {
      description:
        'List all projects, oldest first, with how many tasks were completed and minutes focused in each.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const projects = await listProjects(userId);
      return json({ count: projects.length, projects: projects.map(presentProject) });
    }
  );

  server.registerTool(
    'create_project',
    {
      description: 'Create a project. Check list_projects first to avoid duplicates.',
      inputSchema: { name: z.string().min(1).max(100) },
    },
    async ({ name }) => json(presentProject(await createProject(userId, name)))
  );

  server.registerTool(
    'delete_project',
    {
      description:
        'Permanently delete a project with all its features and tasks. Completed minutes stay in the stats. Requires confirm: true — confirm with the user before calling.',
      inputSchema: { id: z.string(), confirm: z.literal(true) },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const deleted = await deleteProject(userId, id);
      return deleted
        ? json({ deleted: { id, name: deleted.name } })
        : error(`No project with id ${id}`);
    }
  );

  // Features

  server.registerTool(
    'list_features',
    {
      description: 'List the features (groups of tasks) in a project, oldest first.',
      inputSchema: { projectId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => {
      const features = await listFeatures(userId, projectId);
      return features
        ? json({ count: features.length, features: features.map(presentFeature) })
        : error(`No project with id ${projectId}`);
    }
  );

  server.registerTool(
    'create_feature',
    {
      description:
        'Create a feature in a project. Tasks always belong to a feature, so create one before adding tasks to a new project.',
      inputSchema: { projectId: z.string(), name: z.string().min(1).max(100) },
    },
    async ({ projectId, name }) => {
      const feature = await createFeature(userId, projectId, name);
      return feature ? json(presentFeature(feature)) : error(`No project with id ${projectId}`);
    }
  );

  server.registerTool(
    'delete_feature',
    {
      description:
        'Permanently delete a feature and all its tasks. Completed minutes stay in the stats. Requires confirm: true — confirm with the user before calling.',
      inputSchema: { id: z.string(), confirm: z.literal(true) },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const deleted = await deleteFeature(userId, id);
      return deleted
        ? json({ deleted: { id, name: deleted.name } })
        : error(`No feature with id ${id}`);
    }
  );

  // Tasks

  server.registerTool(
    'list_tasks',
    {
      description:
        'List tasks, oldest first, with their feature and project names. Defaults to pending tasks only. Optionally narrow to a project or feature, or search descriptions (case-insensitive). Dates are YYYY-MM-DD (UTC).',
      inputSchema: {
        projectId: z.string().optional(),
        featureId: z.string().optional(),
        status: z
          .enum(['pending', 'completed', 'all'])
          .optional()
          .describe('Which tasks to return. Default "pending".'),
        search: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId, featureId, status = 'pending', search }) => {
      const tasks = await listAllTasks(userId, projectId);
      if (!tasks) return error(`No project with id ${projectId}`);

      const needle = search?.toLowerCase();
      const rows = tasks.filter(
        (t) =>
          (featureId === undefined || t.featureId === featureId) &&
          (status === 'all' || (status === 'completed') === (t.completedAt !== null)) &&
          (!needle || t.description.toLowerCase().includes(needle))
      );

      const projects = new Map((await listProjects(userId)).map((p) => [p.id, p.name]));
      const featureIds = [...new Set(rows.map((t) => t.featureId))];
      const features = new Map(
        (await Promise.all(featureIds.map((id) => getFeature(userId, id))))
          .filter((f) => f !== null)
          .map((f) => [f.id, f.name])
      );

      return json({
        count: rows.length,
        tasks: rows.map((t) =>
          presentTask(t, { feature: features.get(t.featureId), project: projects.get(t.projectId) })
        ),
      });
    }
  );

  server.registerTool(
    'get_task',
    {
      description: 'Get one task by id.',
      inputSchema: { id: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const task = await getTask(userId, id);
      return task ? json(presentTask(task)) : error(`No task with id ${id}`);
    }
  );

  server.registerTool(
    'add_task',
    {
      description:
        'Add a pending task to a feature. Keep it small enough to finish in one 15-minute block (or 30 for two). Use list_features to find the featureId, and list_tasks with search to avoid duplicates.',
      inputSchema: {
        featureId: z.string(),
        description: z.string().min(1).max(500),
        duration: duration.optional(),
      },
    },
    async ({ featureId, description, duration = 15 }) => {
      const task = await createTask(userId, featureId, description, duration);
      return task ? json(presentTask(task)) : error(`No feature with id ${featureId}`);
    }
  );

  server.registerTool(
    'update_task',
    {
      description:
        'Update a task. Only the fields you pass are changed. completed: true ticks it off for today (counts toward stats and the streak); false unticks it. A completed task\'s duration can\'t change until it is unticked.',
      inputSchema: {
        id: z.string(),
        description: z.string().min(1).max(500).optional(),
        duration: duration.optional(),
        completed: z.boolean().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ id, description, duration, completed }) => {
      try {
        // Untick before changing the duration, tick after, so stats use the right length
        if (completed === false && !(await setTaskCompleted(userId, id, false))) {
          return error(`No task with id ${id}`);
        }
        let task = await updateTask(userId, id, { description, duration });
        if (!task) return error(`No task with id ${id}`);
        if (completed === true) task = await setTaskCompleted(userId, id, true);
        return json(presentTask(task!));
      } catch (err) {
        if (err instanceof TaskUpdateError) return error(err.message);
        throw err;
      }
    }
  );

  server.registerTool(
    'delete_task',
    {
      description:
        'Permanently delete a task. If it was completed, its minutes stay in the stats. Requires confirm: true — confirm with the user before calling.',
      inputSchema: { id: z.string(), confirm: z.literal(true) },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      const deleted = await deleteTask(userId, id);
      return deleted
        ? json({ deleted: { id, description: deleted.description } })
        : error(`No task with id ${id}`);
    }
  );

  // Stats

  server.registerTool(
    'get_stats',
    {
      description:
        'Focus stats: tasks completed and minutes focused (all time, or for one project), today and the last 7 days, and the current and longest daily streak over the last year. A day counts toward the streak if at least one block was completed; today without one yet doesn\'t break it. Dates are YYYY-MM-DD (UTC).',
      inputSchema: { projectId: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => {
      if (projectId && !(await getProject(userId, projectId))) {
        return error(`No project with id ${projectId}`);
      }
      const [totals, year] = await Promise.all([
        getStats(userId, projectId),
        getTimeline(userId, 'yearly'),
      ]);
      const days = year.data;
      const last7 = days.slice(-7);
      const streak = computeStreak(days);
      return json({
        ...(projectId ? { projectId } : {}),
        totals,
        today: days[days.length - 1] ?? null,
        last7Days: {
          minutes: last7.reduce((sum, d) => sum + d.minutes, 0),
          days: last7.map(({ date, count, minutes }) => ({ date, blocks: count, minutes })),
        },
        streak: { currentDays: streak.current, longestDays: streak.longest },
        note: projectId
          ? 'today, last7Days and streak cover all projects; totals are for this project.'
          : undefined,
      });
    }
  );
}
