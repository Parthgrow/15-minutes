import Dexie, { Table } from 'dexie';
import { Project, Task, Streak, SharedTask } from './types';

export class FifteenMinutesDB extends Dexie {
  projects!: Table<Project>;
  tasks!: Table<Task>;
  streaks!: Table<Streak>;
  sharedTasks!: Table<SharedTask>;

  constructor() {
    super('FifteenMinutesDB');

    this.version(1).stores({
      projects: 'id, name, createdAt, tasksCompleted',
      tasks: 'id, projectId, completedAt, createdAt',
      streaks: 'id, partnerId, currentStreak',
      sharedTasks: 'id, taskId, sharedWith, sharedAt'
    });
  }
}

export const db = new FifteenMinutesDB();

// Helper functions for common operations
export const dbHelpers = {
  // Projects
  async createProject(name: string): Promise<Project> {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      tasksCompleted: 0
    };
    await db.projects.add(project);
    return project;
  },

  async getProjects(): Promise<Project[]> {
    return await db.projects.orderBy('createdAt').reverse().toArray();
  },

  async getProject(id: string): Promise<Project | undefined> {
    return await db.projects.get(id);
  },

  async getProjectByName(name: string): Promise<Project | undefined> {
    return await db.projects.where('name').equalsIgnoreCase(name).first();
  },

  async incrementProjectTasks(projectId: string): Promise<void> {
    const project = await db.projects.get(projectId);
    if (project) {
      await db.projects.update(projectId, {
        tasksCompleted: project.tasksCompleted + 1
      });
    }
  },

  // Tasks
  async createTask(projectId: string, description: string): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      projectId,
      description,
      completedAt: null,
      createdAt: Date.now(),
      duration: 15
    };
    await db.tasks.add(task);
    return task;
  },

  async getTasks(projectId: string): Promise<Task[]> {
    return await db.tasks
      .where('projectId')
      .equals(projectId)
      .and(task => task.completedAt === null)
      .sortBy('createdAt');
  },

  async getAllTasks(projectId: string): Promise<Task[]> {
    return await db.tasks
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('createdAt');
  },

  async completeTask(taskId: string): Promise<Task | undefined> {
    const task = await db.tasks.get(taskId);
    if (task && task.completedAt === null) {
      await db.tasks.update(taskId, { completedAt: Date.now() });
      await this.incrementProjectTasks(task.projectId);
      return await db.tasks.get(taskId);
    }
    return undefined;
  },

  async getCompletedTasksCount(): Promise<number> {
    return await db.tasks.where('completedAt').above(0).count();
  },

  // Streaks
  async createStreak(partnerName: string): Promise<Streak> {
    const streak: Streak = {
      id: crypto.randomUUID(),
      partnerId: crypto.randomUUID(), // For now, just generate a unique ID
      partnerName,
      currentStreak: 0,
      lastCompletedDate: '',
      longestStreak: 0
    };
    await db.streaks.add(streak);
    return streak;
  },

  async getStreaks(): Promise<Streak[]> {
    return await db.streaks.toArray();
  },

  async updateStreak(streakId: string, increment: boolean = true): Promise<void> {
    const streak = await db.streaks.get(streakId);
    if (streak) {
      const today = new Date().toISOString().split('T')[0];
      const newStreak = increment ? streak.currentStreak + 1 : streak.currentStreak;
      await db.streaks.update(streakId, {
        currentStreak: newStreak,
        lastCompletedDate: today,
        longestStreak: Math.max(streak.longestStreak, newStreak)
      });
    }
  },

  // Shared Tasks
  async shareTask(taskId: string, taskDescription: string, partnerName: string): Promise<SharedTask> {
    const sharedTask: SharedTask = {
      id: crypto.randomUUID(),
      taskId,
      taskDescription,
      sharedWith: partnerName,
      sharedAt: Date.now()
    };
    await db.sharedTasks.add(sharedTask);
    return sharedTask;
  },

  async getSharedTasks(): Promise<SharedTask[]> {
    return await db.sharedTasks.orderBy('sharedAt').reverse().toArray();
  }
};
