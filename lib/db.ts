import Dexie, { Table } from 'dexie';
import { Project, Feature, Task, Streak, SharedTask } from './types';

export class FifteenMinutesDB extends Dexie {
  projects!: Table<Project>;
  features!: Table<Feature>;
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

    // Version 2: Add features table and update tasks to include featureId
    this.version(2).stores({
      projects: 'id, name, createdAt, tasksCompleted',
      features: 'id, projectId, name, createdAt, tasksCompleted',
      tasks: 'id, projectId, featureId, completedAt, createdAt',
      streaks: 'id, partnerId, currentStreak',
      sharedTasks: 'id, taskId, sharedWith, sharedAt'
    }).upgrade(async (tx) => {
      // Migration: Create "General" feature for each project and assign orphaned tasks
      const projects = await tx.table('projects').toArray();
      const tasks = await tx.table('tasks').toArray();
      
      for (const project of projects) {
        // Get all features for this project
        const projectFeatures = await tx.table('features')
          .where('projectId')
          .equals(project.id)
          .toArray();
        
        // Check if "General" feature already exists
        const existingGeneral = projectFeatures.find(f => f.name === 'General');
        
        let generalFeatureId: string;
        
        if (!existingGeneral) {
          // Create "General" feature
          const generalFeature: Feature = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name: 'General',
            createdAt: Date.now(),
            tasksCompleted: 0
          };
          await tx.table('features').add(generalFeature);
          generalFeatureId = generalFeature.id;
        } else {
          generalFeatureId = existingGeneral.id;
        }
        
        // Assign all tasks without featureId to General feature
        const orphanedTasks = tasks.filter(
          (t: Task & { featureId?: string }) => t.projectId === project.id && !t.featureId
        );
        
        for (const task of orphanedTasks) {
          await tx.table('tasks').update(task.id, {
            featureId: generalFeatureId
          });
        }
      }
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

  // Features
  async createFeature(projectId: string, name: string): Promise<Feature> {
    const feature: Feature = {
      id: crypto.randomUUID(),
      projectId,
      name,
      createdAt: Date.now(),
      tasksCompleted: 0
    };
    await db.features.add(feature);
    return feature;
  },

  async getFeatures(projectId: string): Promise<Feature[]> {
    return await db.features
      .where('projectId')
      .equals(projectId)
      .sortBy('createdAt');
  },

  async getFeature(id: string): Promise<Feature | undefined> {
    return await db.features.get(id);
  },

  async getFeatureByName(projectId: string, name: string): Promise<Feature | undefined> {
    const features = await db.features
      .where('projectId')
      .equals(projectId)
      .toArray();
    return features.find(f => f.name.toLowerCase() === name.toLowerCase());
  },

  async getFeatureByIndex(projectId: string, index: number): Promise<Feature | undefined> {
    const features = await this.getFeatures(projectId);
    return features[index - 1]; // 1-based index
  },

  async incrementFeatureTasks(featureId: string): Promise<void> {
    const feature = await db.features.get(featureId);
    if (feature) {
      await db.features.update(featureId, {
        tasksCompleted: feature.tasksCompleted + 1
      });
    }
  },

  async getOrCreateGeneralFeature(projectId: string): Promise<Feature> {
    let generalFeature = await this.getFeatureByName(projectId, 'General');
    if (!generalFeature) {
      generalFeature = await this.createFeature(projectId, 'General');
    }
    return generalFeature;
  },

  // Tasks
  async createTask(projectId: string, featureId: string, description: string): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      projectId,
      featureId,
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

  async getTasksByFeature(featureId: string): Promise<Task[]> {
    return await db.tasks
      .where('featureId')
      .equals(featureId)
      .and(task => task.completedAt === null)
      .sortBy('createdAt');
  },

  async getTasksByProject(projectId: string): Promise<Task[]> {
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
      await this.incrementFeatureTasks(task.featureId);
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
