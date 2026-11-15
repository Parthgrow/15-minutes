import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { listMcpTokens, MAX_TOKENS_PER_USER } from "@/lib/mcp/auth";
import { revokeToken } from "@/app/actions/mcp-tokens";
import CreateTokenForm from "./CreateTokenForm";

export const metadata = { title: "Connect Claude · 15 Minutes" };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [tokens, headersList] = await Promise.all([listMcpTokens(userId), headers()]);
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const proto =
    headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const mcpUrl = `${proto}://${host}/api/mcp`;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="border-b border-line px-5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center gap-4">
        <Link href="/" className="text-muted hover:text-ink transition-colors text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="w-px h-4 bg-line" />
        <h1 className="text-ink font-medium">Connect Claude</h1>
      </div>

      <main className="max-w-2xl mx-auto px-5 sm:px-6 py-8 flex flex-col gap-8">
        <p className="text-sm text-muted leading-relaxed">
          Let Claude (Claude Code, claude.ai, or the desktop and mobile apps) read and manage the
          projects, features and tasks for{" "}
          <span className="text-ink">{session.user.email ?? "your account"}</span> through the MCP
          server at <code className="rounded bg-surface px-1 text-ink">{mcpUrl}</code>. Anyone
          with a token has full access to your data, so treat it like a password.
        </p>

        <CreateTokenForm mcpUrl={mcpUrl} disabled={tokens.length >= MAX_TOKENS_PER_USER} />

        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-widest text-faint">
            Active tokens ({tokens.length}/{MAX_TOKENS_PER_USER})
          </h2>
          {tokens.length === 0 ? (
            <p className="text-sm text-muted">No tokens yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-ink truncate">{token.name}</span>
                    <span className="text-xs text-faint">
                      <code>{token.hint}…</code> · created{" "}
                      {new Date(token.createdAt).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <form action={revokeToken}>
                    <input type="hidden" name="id" value={token.id} />
                    <button type="submit" className="text-sm text-red-300 hover:text-red-200 py-1">
                      Revoke
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2 text-sm text-muted">
          <h2 className="text-xs uppercase tracking-widest text-faint">Local server</h2>
          <p className="leading-relaxed">
            Working in this repo with Claude Code? The local server in <code>.mcp.json</code> talks
            to Firestore directly. Set <code>FIFTEEN_MINUTES_USER_ID</code> in <code>.env</code> to
            your user id:
          </p>
          <code className="rounded-lg bg-surface p-3 text-xs text-ink break-all">{userId}</code>
        </section>
      </main>
    </div>
  );
}
