import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { getStats } from '@/lib/data/stats';

// GET /api/tasks/stats - Get task statistics
// Query params: projectId (optional)
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const stats = await getStats(userId, request.nextUrl.searchParams.get('projectId'));
    return stats
      ? NextResponse.json(stats)
      : NextResponse.json({ error: 'Project not found' }, { status: 404 });
  } catch (error) {
    return serverError('Failed to fetch task stats', error);
  }
}
