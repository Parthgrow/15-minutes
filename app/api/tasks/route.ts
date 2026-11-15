import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { createTask, listFeatureTasks } from '@/lib/data/tasks';

const featureNotFound = () => NextResponse.json({ error: 'Feature not found' }, { status: 404 });

// GET /api/tasks - Get tasks for a feature
// Query params: featureId, includeCompleted
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const searchParams = request.nextUrl.searchParams;
    const featureId = searchParams.get('featureId');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    if (!featureId) {
      return NextResponse.json({ error: 'featureId is required' }, { status: 400 });
    }
    const tasks = await listFeatureTasks(userId, featureId, includeCompleted);
    return tasks ? NextResponse.json(tasks) : featureNotFound();
  } catch (error) {
    return serverError('Failed to fetch tasks', error);
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const { featureId, description, duration } = await request.json();
    if (!featureId || typeof featureId !== 'string') {
      return NextResponse.json({ error: 'featureId is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Task description is required' }, { status: 400 });
    }
    const task = await createTask(userId, featureId, description, duration === 30 ? 30 : 15);
    return task ? NextResponse.json(task, { status: 201 }) : featureNotFound();
  } catch (error) {
    return serverError('Failed to create task', error);
  }
}
