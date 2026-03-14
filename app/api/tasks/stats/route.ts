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

    // Project-specific stats — read cached fields from project document
    if (projectId) {
      const projectDoc = await db.collection('projects').doc(projectId).get();

      if (!projectDoc.exists || projectDoc.data()?.userId !== session.user.id) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      const project = projectDoc.data()!;
      const completedCount = project.tasksCompleted || 0;
      const totalMinutes = project.totalMinutes || 0;

      // Pending count is still queried live — it's a count (cheap) and
      // not worth caching separately for now
      const pendingSnapshot = await db
        .collection('tasks')
        .where('userId', '==', session.user.id)
        .where('projectId', '==', projectId)
        .where('completedAt', '==', null)
        .count()
        .get();

      const pendingCount = pendingSnapshot.data().count;

      return NextResponse.json({
        completedCount,
        pendingCount,
        totalCount: completedCount + pendingCount,
        totalMinutes,
      });
    }

    // Global stats — read fully from cached user stats object
    const userDoc = await db.doc(`users/${session.user.id}`).get();

    if (!userDoc.exists || !userDoc.data()?.stats) {
      return NextResponse.json({
        completedCount: 0,
        pendingCount: 0,
        totalCount: 0,
        totalMinutes: 0,
      });
    }

    const stats = userDoc.data()!.stats;
    const completedCount = stats.totalCompleted || 0;
    const pendingCount = stats.totalPending || 0;
    const totalMinutes = stats.totalMinutes || 0;

    return NextResponse.json({
      completedCount,
      pendingCount,
      totalCount: completedCount + pendingCount,
      totalMinutes,
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task stats' },
      { status: 500 }
    );
  }
}
