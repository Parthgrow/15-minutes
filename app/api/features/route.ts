import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { createFeature, listFeatures } from '@/lib/data/features';

const projectNotFound = () => NextResponse.json({ error: 'Project not found' }, { status: 404 });

// GET /api/features?projectId=xxx - Get all features for a project
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    const features = await listFeatures(userId, projectId);
    return features ? NextResponse.json(features) : projectNotFound();
  } catch (error) {
    return serverError('Failed to fetch features', error);
  }
}

// POST /api/features - Create a new feature
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const { projectId, name } = await request.json();
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Feature name is required' }, { status: 400 });
    }
    const feature = await createFeature(userId, projectId, name);
    return feature ? NextResponse.json(feature, { status: 201 }) : projectNotFound();
  } catch (error) {
    return serverError('Failed to create feature', error);
  }
}
