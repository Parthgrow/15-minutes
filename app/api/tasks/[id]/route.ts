import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { FieldValue } from 'firebase-admin/firestore';
import {
  incrementCompletedStats,
  decrementCompletedStats,
  decrementPendingStats,
  decrementCompletedStatsOnDelete,
  toDateString,
} from '@/lib/firebase/stats';

// GET /api/tasks/[id] - Get a task by ID
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

    const taskDoc = await db.collection('tasks').doc(id).get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(taskDoc.data());
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update a task (mark as complete/uncomplete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { completed } = body;

    const taskRef = db.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskDoc.data()!;
    const userId = task.userId || session.user.id;

    const wasCompleted = task.completedAt !== null;
    const isNowCompleted = completed === true;

    // Task is being completed
    if (!wasCompleted && isNowCompleted) {
      const completedAt = Date.now();
      const completedDate = toDateString(completedAt);

      // Update task with completion info
      await taskRef.update({ completedAt, completedDate });

      // Update user stats (summary + daily aggregation)
      await incrementCompletedStats(userId, completedDate);

      // Increment feature's tasksCompleted
      const featureRef = db.collection('features').doc(task.featureId);
      await featureRef.update({
        tasksCompleted: FieldValue.increment(1),
      });

      // Get the feature to find the projectId, then increment project's tasksCompleted
      const featureDoc = await featureRef.get();
      if (featureDoc.exists) {
        const feature = featureDoc.data()!;
        const projectRef = db.collection('projects').doc(feature.projectId);
        await projectRef.update({
          tasksCompleted: FieldValue.increment(1),
        });
      }

      return NextResponse.json({ ...task, completedAt, completedDate });
    }

    // Task is being uncompleted
    if (wasCompleted && !isNowCompleted) {
      const previousDate = task.completedDate || toDateString(task.completedAt);

      // Update task to remove completion
      await taskRef.update({ completedAt: null, completedDate: null });

      // Update user stats
      await decrementCompletedStats(userId, previousDate);

      // Decrement feature's tasksCompleted
      const featureRef = db.collection('features').doc(task.featureId);
      await featureRef.update({
        tasksCompleted: FieldValue.increment(-1),
      });

      // Decrement project's tasksCompleted
      const featureDoc = await featureRef.get();
      if (featureDoc.exists) {
        const feature = featureDoc.data()!;
        const projectRef = db.collection('projects').doc(feature.projectId);
        await projectRef.update({
          tasksCompleted: FieldValue.increment(-1),
        });
      }

      return NextResponse.json({ ...task, completedAt: null, completedDate: null });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const taskRef = db.collection('tasks').doc(id);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskDoc.data()!;
    const userId = task.userId || session.user.id;

    await taskRef.delete();

    // Update stats based on task state
    if (task.completedAt !== null) {
      // Was completed - decrement completed count and daily aggregation
      const completedDate = task.completedDate || toDateString(task.completedAt);
      await decrementCompletedStatsOnDelete(userId, completedDate);
    } else {
      // Was pending - decrement pending count
      await decrementPendingStats(userId);
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
