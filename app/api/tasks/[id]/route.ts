import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { deleteTask, getTask, setTaskCompleted } from '@/lib/data/tasks';

type Params = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'Task not found' }, { status: 404 });

// GET /api/tasks/[id] - Get a task by ID
export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const task = await getTask(userId, (await params).id);
    return task ? NextResponse.json(task) : notFound();
  } catch (error) {
    return serverError('Failed to fetch task', error);
  }
}

// PATCH /api/tasks/[id] - Mark a task complete or not ({ completed: boolean })
export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const { completed } = await request.json();
    const task = await setTaskCompleted(userId, (await params).id, completed === true);
    return task ? NextResponse.json(task) : notFound();
  } catch (error) {
    return serverError('Failed to update task', error);
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const deleted = await deleteTask(userId, (await params).id);
    return deleted ? NextResponse.json({ message: 'Task deleted successfully' }) : notFound();
  } catch (error) {
    return serverError('Failed to delete task', error);
  }
}
