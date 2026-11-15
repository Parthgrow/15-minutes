import { createHash, randomBytes, randomUUID } from 'crypto';
import { db } from '@/lib/firebase/config';

// Per-user bearer tokens for the remote MCP endpoints (app/api/mcp).
// The raw token is returned exactly once from createMcpToken; Firestore only
// ever holds its SHA-256, so a database leak doesn't leak usable tokens.
//
//   mcpTokens/<sha256>                 → { userId, tokenId }
//   users/<userId>/mcpTokens/<tokenId> → McpTokenInfo

export const MAX_TOKENS_PER_USER = 10;
const TOKEN_PREFIX = 'fm_';

export type McpTokenInfo = {
  id: string;
  name: string;
  // First few characters of the raw token, so the user can tell tokens apart
  hint: string;
  hash: string;
  createdAt: number;
};

type TokenRecord = { userId: string; tokenId: string };

export class TooManyTokensError extends Error {}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const tokenRef = (hash: string) => db.collection('mcpTokens').doc(hash);
const userTokens = (userId: string) => db.collection('users').doc(userId).collection('mcpTokens');

export async function listMcpTokens(userId: string): Promise<McpTokenInfo[]> {
  const snapshot = await userTokens(userId).get();
  return snapshot.docs
    .map((doc) => doc.data() as McpTokenInfo)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createMcpToken(userId: string, name: string): Promise<string> {
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const hash = hashToken(token);
  const info: McpTokenInfo = {
    id: randomUUID(),
    name,
    hint: token.slice(0, TOKEN_PREFIX.length + 6),
    hash,
    createdAt: Date.now(),
  };

  // Count and write in one transaction so concurrent requests can't pass the cap
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(userTokens(userId));
    if (existing.size >= MAX_TOKENS_PER_USER) {
      throw new TooManyTokensError(
        `You can have at most ${MAX_TOKENS_PER_USER} tokens. Revoke one first.`
      );
    }
    tx.set(tokenRef(hash), { userId, tokenId: info.id } satisfies TokenRecord);
    tx.set(userTokens(userId).doc(info.id), info);
  });
  return token;
}

export async function revokeMcpToken(userId: string, tokenId: string): Promise<void> {
  if (!tokenId) return;
  const infoRef = userTokens(userId).doc(tokenId);
  const info = (await infoRef.get()).data() as McpTokenInfo | undefined;
  if (!info) return;
  const batch = db.batch();
  batch.delete(tokenRef(info.hash));
  batch.delete(infoRef);
  await batch.commit();
}

async function userIdForToken(token: string | undefined): Promise<string | null> {
  if (!token?.startsWith(TOKEN_PREFIX)) return null;
  const record = (await tokenRef(hashToken(token)).get()).data() as TokenRecord | undefined;
  return record?.userId ?? null;
}

// For Route Handlers: resolves `Authorization: Bearer <token>` to a userId,
// or returns a 401 Response.
export async function requireMcpUserId(req: Request): Promise<string | Response> {
  const match = req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i);
  const userId = await userIdForToken(match?.[1]);

  if (!userId) {
    return Response.json(
      { error: 'Missing or invalid MCP token. Generate one at /settings.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="15-minutes"' } }
    );
  }
  return userId;
}

// Same tokens, carried in the URL path (/api/mcp/<token>) for clients such as
// claude.ai custom connectors that can't send an Authorization header. No
// WWW-Authenticate challenge here: it would send those clients looking for an
// OAuth server this app doesn't run.
export async function requireMcpUserIdFromPath(token: string): Promise<string | Response> {
  const userId = await userIdForToken(token);
  if (!userId) {
    return Response.json(
      { error: 'Invalid or revoked connector URL. Generate a new one at /settings.' },
      { status: 401 }
    );
  }
  return userId;
}
