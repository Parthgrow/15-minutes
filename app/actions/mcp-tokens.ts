'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createMcpToken, revokeMcpToken, TooManyTokensError } from '@/lib/mcp/auth';

export type CreateTokenState = { error?: string; token?: string; name?: string } | undefined;

async function requireSessionUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Not signed in');
  return session.user.id;
}

export async function createToken(
  _prevState: CreateTokenState,
  formData: FormData
): Promise<CreateTokenState> {
  const userId = await requireSessionUserId();
  const name = String(formData.get('name') ?? '').trim().slice(0, 50) || 'Claude';

  let token;
  try {
    token = await createMcpToken(userId, name);
  } catch (err) {
    if (err instanceof TooManyTokensError) return { error: err.message };
    throw err;
  }

  revalidatePath('/settings');
  return { token, name };
}

export async function revokeToken(formData: FormData): Promise<void> {
  const userId = await requireSessionUserId();
  await revokeMcpToken(userId, String(formData.get('id') ?? ''));
  revalidatePath('/settings');
}
