import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { decrementPendingStats } from '@/lib/firebase/stats';

// GET /api/projects/[id] - Get a project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const projectDoc = await db.collection('projects').doc(id).get();

    if (!projectDoc.exists || projectDoc.data()?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(projectDoc.data());
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project and cascade delete its features and tasks
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = session.user.id;

    const projectRef = db.collection('projects').doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists || projectDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all features belonging to this project
    const featuresSnap = await db
      .collection('features')
      .where('projectId', '==', id)
      .get();

    // For each feature, fetch and delete its tasks (with stats updates)
    for (const featureDoc of featuresSnap.docs) {
      const tasksSnap = await db
        .collection('tasks')
        .where('featureId', '==', featureDoc.id)
        .get();

      const taskBatch = db.batch();
      const statUpdates: Promise<void>[] = [];

      for (const taskDoc of tasksSnap.docs) {
        const task = taskDoc.data();
        taskBatch.delete(taskDoc.ref);

        if (!task.completedAt) {
          statUpdates.push(decrementPendingStats(userId));
        }
        // Completed tasks: leave totalCompleted and dailyStats intact —
        // earned beans are permanent, deleting a project doesn't erase past work.
      }

      await taskBatch.commit();
      await Promise.all(statUpdates);

      // Delete the feature
      await featureDoc.ref.delete();
    }

    // Delete the project
    await projectRef.delete();

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
