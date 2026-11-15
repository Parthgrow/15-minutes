import { randomUUID } from 'crypto';
import { db } from '@/lib/firebase/config';
import { decrementPendingStats } from '@/lib/firebase/stats';
import { Feature } from '@/lib/types';
import { getProject } from './projects';

// Features have no userId of their own: ownership comes from the parent project.

// Features of a project, oldest first, or null if the project isn't the user's
export async function listFeatures(userId: string, projectId: string): Promise<Feature[] | null> {
  if (!(await getProject(userId, projectId))) return null;
  const snapshot = await db.collection('features').where('projectId', '==', projectId).get();
  return snapshot.docs
    .map((doc) => doc.data() as Feature)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getFeature(userId: string, id: string): Promise<Feature | null> {
  const doc = await db.collection('features').doc(id).get();
  if (!doc.exists) return null;
  const feature = doc.data() as Feature;
  return (await getProject(userId, feature.projectId)) ? feature : null;
}

export async function createFeature(
  userId: string,
  projectId: string,
  name: string
): Promise<Feature | null> {
  if (!(await getProject(userId, projectId))) return null;
  const id = randomUUID();
  const feature: Feature = {
    id,
    projectId,
    name,
    createdAt: Date.now(),
    tasksCompleted: 0,
  };
  await db.collection('features').doc(id).set(feature);
  return feature;
}

// Deletes the feature and its tasks. Completed work stays in the stats.
export async function deleteFeature(userId: string, id: string): Promise<Feature | null> {
  const feature = await getFeature(userId, id);
  if (!feature) return null;

  const tasksSnap = await db.collection('tasks').where('featureId', '==', id).get();
  const taskBatch = db.batch();
  const statUpdates: Promise<void>[] = [];
  for (const taskDoc of tasksSnap.docs) {
    taskBatch.delete(taskDoc.ref);
    if (!taskDoc.data().completedAt) statUpdates.push(decrementPendingStats(userId));
  }
  await taskBatch.commit();
  await Promise.all(statUpdates);

  await db.collection('features').doc(id).delete();
  return feature;
}
