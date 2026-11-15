import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { deleteFeature, getFeature } from '@/lib/data/features';

type Params = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'Feature not found' }, { status: 404 });

// GET /api/features/[id] - Get a feature by ID
export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const feature = await getFeature(userId, (await params).id);
    return feature ? NextResponse.json(feature) : notFound();
  } catch (error) {
    return serverError('Failed to fetch feature', error);
  }
}

// DELETE /api/features/[id] - Delete a feature and cascade delete its tasks
export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const deleted = await deleteFeature(userId, (await params).id);
    return deleted ? NextResponse.json({ message: 'Feature deleted successfully' }) : notFound();
  } catch (error) {
    return serverError('Failed to delete feature', error);
  }
}
