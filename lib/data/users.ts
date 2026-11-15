import { db } from '@/lib/firebase/config';

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return { id: userId, name: data.name ?? null, email: data.email ?? null };
}
