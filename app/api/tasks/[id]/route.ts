import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { FieldValue } from 'firebase-admin/firestore';
import {
  incrementCompletedStats,
  decrementCompletedStats,
  decrementPendingStats,
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
    const duration: number = task.duration ?? 15;

    const wasCompleted = task.completedAt !== null;
    const isNowCompleted = completed === true;

    // Task is being completed
    if (!wasCompleted && isNowCompleted) {
      const completedAt = Date.now();
      const completedDate = toDateString(completedAt);

      await taskRef.update({ completedAt, completedDate });

      // Increment root-level stats (totalCompleted, totalMinutes, dailyStats)
      await incrementCompletedStats(userId, completedDate, duration);

      // Increment feature's tasksCompleted
      const featureRef = db.collection('features').doc(task.featureId);
      await featureRef.update({
        tasksCompleted: FieldValue.increment(1),
      });

      // Increment project's tasksCompleted + totalMinutes
      const featureDoc = await featureRef.get();
      if (featureDoc.exists) {
        const feature = featureDoc.data()!;
        await db.collection('projects').doc(feature.projectId).update({
          tasksCompleted: FieldValue.increment(1),
          totalMinutes: FieldValue.increment(duration),
        });
      }

      return NextResponse.json({ ...task, completedAt, completedDate });
    }

    // Task is being uncompleted (user reversing their action)
    if (wasCompleted && !isNowCompleted) {
      const previousDate = task.completedDate || toDateString(task.completedAt);

      await taskRef.update({ completedAt: null, completedDate: null });

      // Decrement root-level stats (totalCompleted, totalMinutes, dailyStats)
      await decrementCompletedStats(userId, previousDate, duration);

      // Decrement feature's tasksCompleted
      const featureRef = db.collection('features').doc(task.featureId);
      await featureRef.update({
        tasksCompleted: FieldValue.increment(-1),
      });

      // Decrement project's tasksCompleted + totalMinutes
      const featureDoc = await featureRef.get();
      if (featureDoc.exists) {
        const feature = featureDoc.data()!;
        await db.collection('projects').doc(feature.projectId).update({
          tasksCompleted: FieldValue.increment(-1),
          totalMinutes: FieldValue.increment(-duration),
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

    // Only decrement pending count — completed task stats are a permanent ledger
    if (!task.completedAt) {
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
