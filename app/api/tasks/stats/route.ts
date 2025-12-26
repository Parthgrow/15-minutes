import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';

// GET /api/tasks/stats - Get task statistics
// Query params: projectId (optional)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const projectId = request.nextUrl.searchParams.get('projectId');

    // If projectId filter is requested, query tasks directly
    if (projectId) {
      const completedSnapshot = await db
        .collection('tasks')
        .where('userId', '==', session.user.id)
        .where('projectId', '==', projectId)
        .where('completedAt', '!=', null)
        .count()
        .get();

      const pendingSnapshot = await db
        .collection('tasks')
        .where('userId', '==', session.user.id)
        .where('projectId', '==', projectId)
        .where('completedAt', '==', null)
        .count()
        .get();

      const completedCount = completedSnapshot.data().count;
      const pendingCount = pendingSnapshot.data().count;

      return NextResponse.json({
        completedCount,
        pendingCount,
        totalCount: completedCount + pendingCount,
      });
    }

    // No filter - read from user's stats object (fast!)
    const userDoc = await db.doc(`users/${session.user.id}`).get();

    if (!userDoc.exists || !userDoc.data()?.stats) {
      return NextResponse.json({
        completedCount: 0,
        pendingCount: 0,
        totalCount: 0,
      });
    }

    const stats = userDoc.data()!.stats;
    const completedCount = stats.totalCompleted || 0;
    const pendingCount = stats.totalPending || 0;

    return NextResponse.json({
      completedCount,
      pendingCount,
      totalCount: completedCount + pendingCount,
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task stats' },
      { status: 500 }
    );
  }
}
