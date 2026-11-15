import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, serverError } from '@/lib/auth/session';
import { deleteProject, getProject } from '@/lib/data/projects';

type Params = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'Project not found' }, { status: 404 });

// GET /api/projects/[id] - Get a project by ID
export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const project = await getProject(userId, (await params).id);
    return project ? NextResponse.json(project) : notFound();
  } catch (error) {
    return serverError('Failed to fetch project', error);
  }
}

// DELETE /api/projects/[id] - Delete a project and cascade delete its features and tasks
export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const deleted = await deleteProject(userId, (await params).id);
    return deleted ? NextResponse.json({ message: 'Project deleted successfully' }) : notFound();
  } catch (error) {
    return serverError('Failed to delete project', error);
  }
}
