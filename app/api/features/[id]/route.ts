import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { decrementPendingStats } from '@/lib/firebase/stats';

// GET /api/features/[id] - Get a feature by ID
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

    const featureDoc = await db.collection('features').doc(id).get();

    if (!featureDoc.exists) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // Verify ownership via parent project
    const feature = featureDoc.data()!;
    const projectDoc = await db.collection('projects').doc(feature.projectId).get();
    if (!projectDoc.exists || projectDoc.data()?.userId !== session.user.id) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json(feature);
  } catch (error) {
    console.error('Error fetching feature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature' },
      { status: 500 }
    );
  }
}

// DELETE /api/features/[id] - Delete a feature and cascade delete its tasks
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

    const featureRef = db.collection('features').doc(id);
    const featureDoc = await featureRef.get();

    if (!featureDoc.exists) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    const feature = featureDoc.data()!;

    // Verify ownership via parent project
    const projectRef = db.collection('projects').doc(feature.projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists || projectDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    // Fetch all tasks belonging to this feature
    const tasksSnap = await db
      .collection('tasks')
      .where('featureId', '==', id)
      .get();

    const taskBatch = db.batch();
    const statUpdates: Promise<void>[] = [];

    for (const taskDoc of tasksSnap.docs) {
      const task = taskDoc.data();
      taskBatch.delete(taskDoc.ref);

      if (!task.completedAt) {
        statUpdates.push(decrementPendingStats(userId));
      }
      // Completed tasks: leave totalCompleted, dailyStats, and project.tasksCompleted
      // intact — earned beans and project history are permanent.
    }

    await taskBatch.commit();
    await Promise.all(statUpdates);

    // Delete the feature
    await featureRef.delete();

    return NextResponse.json({ message: 'Feature deleted successfully' });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature' },
      { status: 500 }
    );
  }
}
