import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { createProject, listProjects } from '@/lib/data/projects';

// GET /api/projects - Get all projects for the user
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    return NextResponse.json(await listProjects(userId));
  } catch (error) {
    return serverError('Failed to fetch projects', error);
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    return NextResponse.json(await createProject(userId, name), { status: 201 });
  } catch (error) {
    return serverError('Failed to create project', error);
  }
}
