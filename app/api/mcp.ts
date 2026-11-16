import { mcpCorsHeaders } from './_lib/mcp.constants';
import { McpHelper } from './_lib/mcp.helper';
import { IMcpProfile } from './_lib/mcp.interfaces';

const methodNotAllowed = (): Response => McpHelper.emptyResponse(405, { allow: 'POST, OPTIONS' });

export async function POST(request: Request): Promise<Response> {
  const profile: IMcpProfile = McpHelper.decodeProfile(request.url);
  const rawBody: string = await request.text();

  return McpHelper.handleBody(rawBody, profile);
}

export async function GET(): Promise<Response> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowed();
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: mcpCorsHeaders });
}
