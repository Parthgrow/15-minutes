import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { getTimeline, Period } from '@/lib/data/stats';

const PERIODS: Period[] = ['daily', 'weekly', 'monthly', 'yearly'];

// GET /api/tasks/stats/timeline?period=daily|weekly|monthly|yearly
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const requested = request.nextUrl.searchParams.get('period') ?? 'daily';
  const period = PERIODS.includes(requested as Period) ? (requested as Period) : 'monthly';

  try {
    return NextResponse.json(await getTimeline(userId, period));
  } catch (error) {
    return serverError('Failed to fetch timeline stats', error);
  }
}
