import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/config';
import {
  decrementCompletedStats,
  decrementPendingStats,
  incrementCompletedStats,
  incrementPendingStats,
  toDateString,
} from '@/lib/firebase/stats';
import { Task } from '@/lib/types';
import { getFeature, listFeatures } from './features';
import { listProjects } from './projects';

export type Duration = 15 | 30;

export interface StoredTask extends Task {
  userId?: string;
  completedDate: string | null;
}

export class TaskUpdateError extends Error {}

const byCreated = (a: { createdAt: number }, b: { createdAt: number }) => a.createdAt - b.createdAt;

// Tasks carry a denormalised userId; older ones may not, so fall back to the
// feature's project for ownership.
async function ownsTask(userId: string, task: StoredTask): Promise<boolean> {
  if (task.userId) return task.userId === userId;
  return (await getFeature(userId, task.featureId)) !== null;
}

export async function getTask(userId: string, id: string): Promise<StoredTask | null> {
  const doc = await db.collection('tasks').doc(id).get();
  if (!doc.exists) return null;
  const task = doc.data() as StoredTask;
  return (await ownsTask(userId, task)) ? task : null;
}

// Tasks of one feature, oldest first; null if the feature isn't the user's.
// Pending only unless includeCompleted.
export async function listFeatureTasks(
  userId: string,
  featureId: string,
  includeCompleted = false
): Promise<StoredTask[] | null> {
  if (!(await getFeature(userId, featureId))) return null;
  let query: FirebaseFirestore.Query = db.collection('tasks').where('featureId', '==', featureId);
  if (!includeCompleted) query = query.where('completedAt', '==', null);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as StoredTask).sort(byCreated);
}

// Every task of the user, optionally narrowed to a project, oldest first
export async function listAllTasks(
  userId: string,
  projectId?: string
): Promise<StoredTask[] | null> {
  const projects = await listProjects(userId);
  const scoped = projectId ? projects.filter((p) => p.id === projectId) : projects;
  if (projectId && scoped.length === 0) return null;

  const features = (await Promise.all(scoped.map((p) => listFeatures(userId, p.id))))
    .flat()
    .filter((f) => f !== null);
  const tasks = await Promise.all(features.map((f) => listFeatureTasks(userId, f.id, true)));
  return tasks.flat().filter((t) => t !== null).sort(byCreated);
}

export async function createTask(
  userId: string,
  featureId: string,
  description: string,
  duration: Duration = 15
): Promise<StoredTask | null> {
  const feature = await getFeature(userId, featureId);
  if (!feature) return null;

  const id = randomUUID();
  const task: StoredTask = {
    id,
    featureId,
    description,
    completedAt: null,
    createdAt: Date.now(),
    duration,
    // Denormalized fields for efficient queries
    userId,
    projectId: feature.projectId,
    completedDate: null,
  };
  await db.collection('tasks').doc(id).set(task);
  await incrementPendingStats(userId);
  return task;
}

// Ticks a task off or back on, keeping user, daily, feature and project
// stats in step. A no-op if it's already in that state.
export async function setTaskCompleted(
  userId: string,
  id: string,
  completed: boolean
): Promise<StoredTask | null> {
  const task = await getTask(userId, id);
  if (!task) return null;

  const taskRef = db.collection('tasks').doc(id);
  const statsUserId = task.userId || userId;
  const duration = task.duration ?? 15;
  const wasCompleted = task.completedAt !== null;

  if (!wasCompleted && completed) {
    const completedAt = Date.now();
    const completedDate = toDateString(completedAt);
    await taskRef.update({ completedAt, completedDate });
    await incrementCompletedStats(statsUserId, completedDate, duration);
    await bumpFeatureAndProject(task.featureId, 1, duration);
    return { ...task, completedAt, completedDate };
  }

  if (wasCompleted && !completed) {
    const previousDate = task.completedDate || toDateString(task.completedAt!);
    await taskRef.update({ completedAt: null, completedDate: null });
    await decrementCompletedStats(statsUserId, previousDate, duration);
    await bumpFeatureAndProject(task.featureId, -1, -duration);
    return { ...task, completedAt: null, completedDate: null };
  }

  return task;
}

async function bumpFeatureAndProject(featureId: string, tasks: number, minutes: number) {
  const featureRef = db.collection('features').doc(featureId);
  await featureRef.update({ tasksCompleted: FieldValue.increment(tasks) });
  const featureDoc = await featureRef.get();
  if (featureDoc.exists) {
    await db
      .collection('projects')
      .doc(featureDoc.data()!.projectId)
      .update({
        tasksCompleted: FieldValue.increment(tasks),
        totalMinutes: FieldValue.increment(minutes),
      });
  }
}

// Changes only the fields passed. A completed task's duration is part of the
// stats ledger, so it can't be changed without unticking the task first.
export async function updateTask(
  userId: string,
  id: string,
  patch: { description?: string; duration?: Duration }
): Promise<StoredTask | null> {
  const task = await getTask(userId, id);
  if (!task) return null;

  const changes: Partial<StoredTask> = {};
  if (patch.description !== undefined) changes.description = patch.description;
  if (patch.duration !== undefined && patch.duration !== task.duration) {
    if (task.completedAt !== null) {
      throw new TaskUpdateError(
        'Cannot change the duration of a completed task. Untick it first (completed: false).'
      );
    }
    changes.duration = patch.duration;
  }

  if (Object.keys(changes).length > 0) {
    await db.collection('tasks').doc(id).update(changes);
  }
  return { ...task, ...changes };
}

// Deletes a task. Completed work stays in the stats; only pending counts drop.
export async function deleteTask(userId: string, id: string): Promise<StoredTask | null> {
  const task = await getTask(userId, id);
  if (!task) return null;
  await db.collection('tasks').doc(id).delete();
  if (!task.completedAt) await decrementPendingStats(task.userId || userId);
  return task;
}
