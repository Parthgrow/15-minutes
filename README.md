This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Claude integration (MCP)

The app ships an [MCP](https://modelcontextprotocol.io) server so Claude (Claude Code, claude.ai, and the desktop and mobile apps) can read and manage your projects, features and tasks. Every tool goes through the same data layer as the web app (`lib/data`), so changes show up in the app immediately.

**Tools:** `whoami`, `list_projects`, `create_project`, `delete_project`, `list_features`, `create_feature`, `delete_feature`, `list_tasks` (filter by project, feature, status, search), `get_task`, `add_task`, `update_task` (only the fields you pass change; `completed: true` ticks a task off), `delete_task`, `get_stats` (totals, today, last 7 days, streaks). Deletes require `confirm: true`. Dates are `YYYY-MM-DD` (UTC). Try: *"Add 'write the pricing page' to the Landing feature"* or *"What's my streak?"*

### Local server (Claude Code in this repo)

`scripts/mcp-server.ts` talks to Firestore directly and is registered in `.mcp.json`.

1. Add to `.env` (next to the Firebase Admin variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`):
   ```
   FIFTEEN_MINUTES_USER_ID=<your user id, shown on /settings>
   ```
2. Run `npm install`, then restart `claude` in this folder and approve the `15-minutes` server (`/mcp` shows its status).

To run it by hand: `npx tsx --env-file=.env scripts/mcp-server.ts`. It exits with a clear message if a variable is missing.

### Remote server (Claude Code on any machine)

The deployed app serves the same tools over Streamable HTTP at `/api/mcp`, authenticated with per-user tokens:

1. Sign in, open **Connect Claude** from the account menu (`/settings`) and click **Generate token**.
2. Run the command shown there:
   ```bash
   claude mcp add --transport http 15-minutes https://<your-app>/api/mcp \
     --header "Authorization: Bearer <token>"
   ```

### claude.ai connector (web, desktop and mobile apps)

Custom connectors only take a URL, so `/settings` also shows a connector URL with the token in the path: `https://<your-app>/api/mcp/<token>`. Paste it into claude.ai under *Settings → Connectors → Add custom connector* and leave authentication empty.

### Security

- A token gives full access to your data. Only its SHA-256 hash is stored (`mcpTokens/<hash>` and `users/<id>/mcpTokens/<tokenId>` in Firestore); the token itself is shown once.
- The connector URL **is** the credential: anyone who has it can use your account until you revoke the token. Use a dedicated token for it.
- Each user can have up to 10 tokens. Revoking one on `/settings` takes effect immediately.
- Tools only ever see the token owner's data; the API routes enforce the same ownership checks.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
