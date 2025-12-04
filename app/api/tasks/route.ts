import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { randomUUID } from 'crypto';

// GET /api/tasks - Get tasks with filters
// Query params: projectId, featureId, includeCompleted
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const featureId = searchParams.get('featureId');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';

    if (!projectId && !featureId) {
      return NextResponse.json(
        { error: 'projectId or featureId is required' },
        { status: 400 }
      );
    }

    let query = db
      .collection('users')
      .doc(session.user.id)
      .collection('tasks')
      .orderBy('createdAt', 'desc') as FirebaseFirestore.Query;

    if (projectId) {
      query = query.where('projectId', '==', projectId);
    }

    if (featureId) {
      query = query.where('featureId', '==', featureId);
    }

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
// If featureId is not provided, auto-assigns to "General" feature
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, featureId, description } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    let finalFeatureId = featureId;

    // If no featureId provided, get or create "General" feature
    if (!finalFeatureId) {
      const featuresRef = db
        .collection('users')
        .doc(userId)
        .collection('features');

      // Check if "General" feature exists for this project
      const existingSnapshot = await featuresRef
        .where('projectId', '==', projectId)
        .where('name', '==', 'General')
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        finalFeatureId = existingSnapshot.docs[0].data().id;
      } else {
        // Create "General" feature
        const generalFeatureId = randomUUID();
        const generalFeature = {
          id: generalFeatureId,
          projectId,
          name: 'General',
          createdAt: Date.now(),
          tasksCompleted: 0,
        };
        await featuresRef.doc(generalFeatureId).set(generalFeature);
        finalFeatureId = generalFeatureId;
      }
    }

    const taskId = randomUUID();
    const task = {
      id: taskId,
      projectId,
      featureId: finalFeatureId,
      description,
      completedAt: null,
      createdAt: Date.now(),
      duration: 15,
    };

    await db
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .doc(taskId)
      .set(task);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
