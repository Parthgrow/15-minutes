#!/usr/bin/env node
// Local MCP server that lets Claude Code read and manage your 15 Minutes data.
// Registered in .mcp.json; to run by hand: npx tsx --env-file=.env scripts/mcp-server.ts
// Needs the Firebase Admin credentials and FIFTEEN_MINUTES_USER_ID in .env.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// stdout carries the MCP protocol, so all diagnostics go to stderr.
const missing = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIFTEEN_MINUTES_USER_ID',
].filter((name) => !process.env[name]);
if (missing.length) {
  console.error(
    `Missing ${missing.join(', ')}.\nAdd them to .env (your user id is shown on the app's Connect Claude page, /settings).`
  );
  process.exit(1);
}

async function main() {
  // Imported only after the check: the Firebase client connects on import
  const { registerTools } = await import('@/lib/mcp/tools');
  const server = new McpServer({ name: '15-minutes', version: '0.1.0' });
  registerTools(server, process.env.FIFTEEN_MINUTES_USER_ID!);
  await server.connect(new StdioServerTransport());
  console.error('15-minutes MCP server running on stdio');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
