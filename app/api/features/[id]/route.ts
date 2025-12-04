import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/firebase/config';

// GET /api/features/[id] - Get a feature by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const featureDoc = await db
      .collection('users')
      .doc(session.user.id)
      .collection('features')
      .doc(id)
      .get();

    if (!featureDoc.exists) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    return NextResponse.json(featureDoc.data());
  } catch (error) {
    console.error('Error fetching feature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature' },
      { status: 500 }
    );
  }
}

// DELETE /api/features/[id] - Delete a feature
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const featureRef = db
      .collection('users')
      .doc(session.user.id)
      .collection('features')
      .doc(id);

    const featureDoc = await featureRef.get();

    if (!featureDoc.exists) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 });
    }

    await featureRef.delete();

    return NextResponse.json({ message: 'Feature deleted successfully' });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature' },
      { status: 500 }
    );
  }
}
