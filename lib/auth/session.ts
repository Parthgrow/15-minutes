import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// For Route Handlers: the signed-in user's id, or a 401 response
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session.user.id;
}

// Logs the error and returns a 500 with a generic message
export function serverError(message: string, error: unknown): NextResponse {
  console.error(`${message}:`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
