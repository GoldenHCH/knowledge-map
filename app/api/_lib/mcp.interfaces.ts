export interface IJsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface IJsonRpcError {
  code: number;
  message: string;
}

export interface IJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: IJsonRpcError;
}

export interface IMcpProfile {
  known: string[];
  shaky: string[];
}

export interface IMcpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
}

export interface IMcpToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent: Record<string, unknown>;
  isError: boolean;
}

export interface IMcpGapConcept {
  title: string;
  summary: string;
  isShaky: boolean;
  prerequisitesKnown: boolean;
}
