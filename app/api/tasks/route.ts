import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { randomUUID } from 'crypto';

// GET /api/tasks - Get tasks for a feature
// Query params: featureId, includeCompleted
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const featureId = searchParams.get('featureId');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    if (!featureId) {
      return NextResponse.json(
        { error: 'featureId is required' },
        { status: 400 }
      );
    }

    let query: FirebaseFirestore.Query = db
      .collection('tasks')
      .where('featureId', '==', featureId);

    if (!includeCompleted) {
      query = query.where('completedAt', '==', null);
    }

    const snapshot = await query.get();
    const tasks = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { featureId, description } = body;

    if (!featureId || typeof featureId !== 'string') {
      return NextResponse.json(
        { error: 'featureId is required' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    const taskId = randomUUID();
    const task = {
      id: taskId,
      featureId,
      description,
      completedAt: null,
      createdAt: Date.now(),
      duration: 15,
    };

    await db.collection('tasks').doc(taskId).set(task);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
