import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools } from '@/lib/mcp/tools';

// Shared by app/api/mcp (header token) and app/api/mcp/[token] (URL token).
// Stateless Streamable HTTP: a fresh server per request keeps it
// serverless-friendly, with no sessions to share between instances.
export async function handleMcpRequest(req: Request, userId: string): Promise<Response> {
  const server = new McpServer({ name: '15-minutes', version: '0.1.0' });
  registerTools(server, userId);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

// Stateless: no server-initiated SSE stream and no session to delete.
export function methodNotAllowed(): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
