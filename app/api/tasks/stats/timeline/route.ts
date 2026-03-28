import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/firebase/config';
import { minutesToTasks } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getStartDate(period: Period): string {
  const d = new Date();
  if (period === 'daily') d.setDate(d.getDate() - 29);
  else if (period === 'weekly') d.setDate(d.getDate() - 83);
  else d.setFullYear(d.getFullYear() - 1);
  return toDateStr(d);
}

// Returns the Monday of the week for a given YYYY-MM-DD string
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

// GET /api/tasks/stats/timeline?period=daily|weekly|monthly
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = (request.nextUrl.searchParams.get('period') ?? 'daily') as Period;
  const startDate = getStartDate(period);

  try {
    const snapshot = await db
      .collection('dailyStats')
      .where('userId', '==', session.user.id)
      .where('date', '>=', startDate)
      .orderBy('date', 'asc')
      .get();

    const raw = snapshot.docs.map((doc) => ({
      date: doc.data().date as string,
      count: (doc.data().count as number) || 0,
      minutes: (doc.data().minutes as number) || 0,
    }));

    if (period === 'daily') {
      const today = new Date();
      const result = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = toDateStr(d);
        const entry = raw.find((r) => r.date === dateStr);
        const minutes = entry?.minutes ?? 0;
        result.push({
          date: dateStr,
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          count: minutesToTasks(minutes),
          minutes,
        });
      }
      return NextResponse.json({ period, data: result });
    }

    if (period === 'weekly') {
      const weekMap = new Map<string, { count: number; minutes: number }>();
      for (const entry of raw) {
        const ws = getWeekStart(entry.date);
        const existing = weekMap.get(ws) ?? { count: 0, minutes: 0 };
        weekMap.set(ws, {
          count: existing.count + entry.count,
          minutes: existing.minutes + entry.minutes,
        });
      }

      const today = new Date();
      const result = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 7);
        const ws = getWeekStart(toDateStr(d));
        const entry = weekMap.get(ws) ?? { count: 0, minutes: 0 };
        const weekDate = new Date(ws + 'T00:00:00');
        result.push({
          date: ws,
          label: weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: minutesToTasks(entry.minutes),
          minutes: entry.minutes,
        });
      }
      return NextResponse.json({ period, data: result });
    }

    // Monthly
    const monthMap = new Map<string, { count: number; minutes: number }>();
    for (const entry of raw) {
      const month = entry.date.slice(0, 7);
      const existing = monthMap.get(month) ?? { count: 0, minutes: 0 };
      monthMap.set(month, {
        count: existing.count + entry.count,
        minutes: existing.minutes + entry.minutes,
      });
    }

    const today = new Date();
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = toDateStr(d).slice(0, 7);
      const entry = monthMap.get(monthStr) ?? { count: 0, minutes: 0 };
      result.push({
        date: monthStr,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: minutesToTasks(entry.minutes),
        minutes: entry.minutes,
      });
    }
    return NextResponse.json({ period, data: result });
  } catch (error) {
    console.error('Error fetching timeline stats:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline stats' }, { status: 500 });
  }
}
