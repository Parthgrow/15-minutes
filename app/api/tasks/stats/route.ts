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

    const tasksRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('tasks');

    let baseQuery: FirebaseFirestore.Query = tasksRef;

    if (projectId) {
      baseQuery = baseQuery.where('projectId', '==', projectId);
    }

    // Get completed count using Firestore count aggregation
    const completedSnapshot = await baseQuery
      .where('completedAt', '!=', null)
      .count()
      .get();
    const completedCount = completedSnapshot.data().count;

    // Get pending count
    const pendingSnapshot = await baseQuery
      .where('completedAt', '==', null)
      .count()
      .get();
    const pendingCount = pendingSnapshot.data().count;

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
