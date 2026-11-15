"use client";

import { useActionState, useState } from "react";
import { createToken } from "@/app/actions/mcp-tokens";

export default function CreateTokenForm({ mcpUrl, disabled }: { mcpUrl: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(createToken, undefined);
  const [copied, setCopied] = useState<string | null>(null);

  const command = state?.token
    ? `claude mcp add --transport http 15-minutes ${mcpUrl} --header "Authorization: Bearer ${state.token}"`
    : "";
  const connectorUrl = state?.token ? `${mcpUrl}/${state.token}` : "";

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-line p-4 sm:p-6">
      <form action={action} className="flex flex-col sm:flex-row gap-2">
        <input
          name="name"
          type="text"
          maxLength={50}
          placeholder="Token name, e.g. Work laptop"
          className="sm:flex-1 min-w-0 h-11 px-3 rounded-lg bg-surface border border-line text-[15px] text-ink placeholder:text-faint focus:border-muted"
        />
        <button
          type="submit"
          disabled={pending || disabled}
          onClick={() => setCopied(null)}
          className="h-11 px-5 rounded-full bg-ink text-bg text-sm font-medium whitespace-nowrap disabled:opacity-30 transition-opacity"
        >
          {pending ? "Generating…" : "Generate token"}
        </button>
      </form>

      {disabled && !state?.token && (
        <p className="text-sm text-muted">You have the maximum number of tokens. Revoke one to add another.</p>
      )}
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}

      {state?.token && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">
            Token <span className="text-ink">{state.name}</span> created. Copy what you need now: it
            won&apos;t be shown again.
          </p>

          <CopyBlock
            title="Claude Code (terminal)"
            hint="Run this in a terminal on any machine."
            text={command}
            copied={copied === "command"}
            onCopy={() => copy("command", command)}
          />

          <CopyBlock
            title="claude.ai connector URL (web, desktop and mobile apps)"
            hint="In claude.ai, open Settings → Connectors → Add custom connector, paste this as the server URL and leave authentication empty. The URL itself is the password: don't share it, and revoke this token if it leaks."
            text={connectorUrl}
            copied={copied === "url"}
            onCopy={() => copy("url", connectorUrl)}
          />
        </div>
      )}
    </div>
  );
}

function CopyBlock({
  title,
  hint,
  text,
  copied,
  onCopy,
}: {
  title: string;
  hint: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm text-ink">{title}</h3>
      <p className="text-xs text-faint leading-relaxed">{hint}</p>
      <pre className="whitespace-pre-wrap break-all rounded-lg bg-surface p-3 text-xs text-ink font-mono">
        {text}
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="self-start h-9 px-4 rounded-full border border-line text-sm text-ink hover:bg-surface transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
