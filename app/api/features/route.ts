import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/firebase/config';
import { randomUUID } from 'crypto';

// GET /api/features?projectId=xxx - Get all features for a project
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const featuresRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('features');

    const snapshot = await featuresRef
      .where('projectId', '==', projectId)
      .orderBy('createdAt', 'asc')
      .get();

    const features = snapshot.docs.map((doc) => doc.data());

    return NextResponse.json(features);
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

// POST /api/features - Create a new feature
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, name } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Feature name is required' },
        { status: 400 }
      );
    }

    const featureId = randomUUID();
    const feature = {
      id: featureId,
      projectId,
      name,
      createdAt: Date.now(),
      tasksCompleted: 0,
    };

    await db
      .collection('users')
      .doc(session.user.id)
      .collection('features')
      .doc(featureId)
      .set(feature);

    return NextResponse.json(feature, { status: 201 });
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      { error: 'Failed to create feature' },
      { status: 500 }
    );
  }
}
