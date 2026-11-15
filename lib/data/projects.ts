import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase/config';
import { decrementPendingStats } from '@/lib/firebase/stats';
import { Project } from '@/lib/types';

// Server-side data layer shared by the API routes and the MCP tools.
// Every function takes the acting userId and only touches that user's data.

export async function listProjects(userId: string): Promise<Project[]> {
  const snapshot = await db.collection('projects').where('userId', '==', userId).get();
  return snapshot.docs
    .map((doc) => doc.data() as Project)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// The project, or null if it doesn't exist or belongs to someone else
export async function getProject(userId: string, id: string): Promise<Project | null> {
  const doc = await db.collection('projects').doc(id).get();
  if (!doc.exists || doc.data()?.userId !== userId) return null;
  return doc.data() as Project;
}

export async function createProject(userId: string, name: string): Promise<Project> {
  const id = randomUUID();
  const project = {
    id,
    userId,
    name,
    createdAt: Date.now(),
    tasksCompleted: 0,
    totalMinutes: 0,
  };
  await db.collection('projects').doc(id).set(project);
  return project;
}

// Deletes the project with its features and tasks. Completed work stays in
// the stats: earned minutes are permanent, only pending counts go down.
export async function deleteProject(userId: string, id: string): Promise<Project | null> {
  const project = await getProject(userId, id);
  if (!project) return null;

  const featuresSnap = await db.collection('features').where('projectId', '==', id).get();

  for (const featureDoc of featuresSnap.docs) {
    const tasksSnap = await db.collection('tasks').where('featureId', '==', featureDoc.id).get();

    const taskBatch = db.batch();
    const statUpdates: Promise<void>[] = [];
    for (const taskDoc of tasksSnap.docs) {
      taskBatch.delete(taskDoc.ref);
      if (!taskDoc.data().completedAt) statUpdates.push(decrementPendingStats(userId));
    }
    await taskBatch.commit();
    await Promise.all(statUpdates);

    await featureDoc.ref.delete();
  }

  await db.collection('projects').doc(id).delete();
  return project;
}
