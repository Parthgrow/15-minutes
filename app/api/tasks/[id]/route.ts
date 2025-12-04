import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/firebase/config';
import { FieldValue } from 'firebase-admin/firestore';

// GET /api/tasks/[id] - Get a task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const taskDoc = await db
      .collection('users')
      .doc(session.user.id)
      .collection('tasks')
      .doc(id)
      .get();

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

// PATCH /api/tasks/[id] - Update a task (mark as complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { completed } = body;

    const userId = session.user.id;
    const taskRef = db
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .doc(id);

    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskDoc.data()!;

    // If marking as complete
    if (completed === true && task.completedAt === null) {
      const completedAt = Date.now();

      // Update task
      await taskRef.update({ completedAt });

      // Increment project's tasksCompleted
      const projectRef = db
        .collection('users')
        .doc(userId)
        .collection('projects')
        .doc(task.projectId);
      await projectRef.update({
        tasksCompleted: FieldValue.increment(1),
      });

      // Increment feature's tasksCompleted
      const featureRef = db
        .collection('users')
        .doc(userId)
        .collection('features')
        .doc(task.featureId);
      await featureRef.update({
        tasksCompleted: FieldValue.increment(1),
      });

      return NextResponse.json({ ...task, completedAt });
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const taskRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('tasks')
      .doc(id);

    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await taskRef.delete();

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
