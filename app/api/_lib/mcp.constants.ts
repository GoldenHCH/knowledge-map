import { IMcpToolDefinition } from './mcp.interfaces';

export const mcpSupportedVersions: string[] = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const mcpDefaultVersion: string = '2025-06-18';

export const mcpServerInfo: Record<string, string> = {
  name: 'gapmap',
  title: 'GapMap',
  version: '0.1.0',
};

export const mcpInstructions: string =
  'GapMap holds a snapshot of what this learner already knows. Before explaining a topic, call find_gaps or check_concepts, build on what they know, and do not re-teach it.';

export const mcpCorsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, DELETE, OPTIONS',
  'access-control-allow-headers':
    'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id',
};

export const mcpEmptyProfileNote: string =
  'No knowledge has been recorded yet. The learner can copy a fresh link from the GapMap app.';

export const mcpMaxProfileTitles: number = 200;

export const mcpMaxTitleLength: number = 80;

export const mcpMaxConcepts: number = 30;

export const mcpTools: IMcpToolDefinition[] = [
  {
    name: 'get_knowledge_profile',
    title: 'Get knowledge profile',
    description:
      'Returns the concepts this learner has marked as known and as shaky in GapMap, with counts. Call this to see what they already know before teaching.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'check_concepts',
    title: 'Check concepts',
    description:
      'For each concept name, reports whether the learner knows it (known), is shaky on it (shaky) or has no record of it (unknown).',
    inputSchema: {
      type: 'object',
      properties: {
        concepts: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 30,
          description: 'Concept names to check, for example "Derivatives" or "Matrix multiplication".',
        },
      },
      required: ['concepts'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'find_gaps',
    title: 'Find gaps for a goal',
    description:
      'Given a learning goal (for example "train a neural network"), returns the ordered concepts the learner still needs, the ones they can skip, and the next step, based on a prerequisite map and their knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'What the learner wants to learn or build.' },
      },
      required: ['goal'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
];
