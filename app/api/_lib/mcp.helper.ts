import { GraphHelper } from '../../src/app/knowledge-map/graph.helper';
import { seededMaps } from '../../src/app/knowledge-map/knowledge-map.constants';
import { IConcept, IKnowledgeMap, ILearningPath } from '../../src/app/knowledge-map/knowledge-map.interfaces';
import { MasteryByConceptKey } from '../../src/app/knowledge-map/knowledge-map.types';
import {
  mcpCorsHeaders,
  mcpDefaultVersion,
  mcpEmptyProfileNote,
  mcpInstructions,
  mcpMaxConcepts,
  mcpMaxProfileTitles,
  mcpMaxTitleLength,
  mcpServerInfo,
  mcpSupportedVersions,
  mcpTools,
} from './mcp.constants';
import {
  IJsonRpcRequest,
  IJsonRpcResponse,
  IMcpGapConcept,
  IMcpProfile,
  IMcpToolResult,
} from './mcp.interfaces';

export class McpHelper {
  private static readonly _stopWords: Set<string> = new Set<string>([
    'the', 'and', 'for', 'with', 'how', 'to', 'learn', 'learning', 'want', 'from', 'about', 'into', 'build', 'make',
    'use', 'using', 'a', 'an', 'of', 'in', 'on', 'my', 'i', 'can', 'basics', 'scratch',
  ]);

  public static jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...mcpCorsHeaders, ...extraHeaders },
    });
  }

  public static emptyResponse(status: number, extraHeaders: Record<string, string> = {}): Response {
    return new Response(null, { status, headers: { ...mcpCorsHeaders, ...extraHeaders } });
  }

  public static errorBody(id: string | number | null, code: number, message: string): IJsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  public static decodeProfile(url: string): IMcpProfile {
    const empty: IMcpProfile = { known: [], shaky: [] };
    try {
      const encoded: string | null = new URL(url).searchParams.get('profile');
      if (!encoded) {
        return empty;
      }

      const parsed: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      if (parsed === null || typeof parsed !== 'object') {
        return empty;
      }

      const record: Record<string, unknown> = parsed as Record<string, unknown>;

      return { known: McpHelper._titles(record['known']), shaky: McpHelper._titles(record['shaky']) };
    } catch {
      return empty;
    }
  }

  public static async handleBody(rawBody: string, profile: IMcpProfile): Promise<Response> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return McpHelper.jsonResponse(McpHelper.errorBody(null, -32700, 'Parse error'), 400);
    }

    const isBatch: boolean = Array.isArray(parsed);
    const messages: unknown[] = isBatch ? (parsed as unknown[]) : [parsed];
    const responses: IJsonRpcResponse[] = [];
    for (const message of messages) {
      const response: IJsonRpcResponse | null = McpHelper._handleMessage(message, profile);
      if (response) {
        responses.push(response);
      }
    }

    if (responses.length === 0) {
      return McpHelper.emptyResponse(202);
    }

    return McpHelper.jsonResponse(isBatch ? responses : responses[0], 200);
  }

  private static _handleMessage(message: unknown, profile: IMcpProfile): IJsonRpcResponse | null {
    if (message === null || typeof message !== 'object' || Array.isArray(message)) {
      return McpHelper.errorBody(null, -32600, 'Invalid Request');
    }

    const request: IJsonRpcRequest = message as IJsonRpcRequest;
    const hasId: boolean = request.id !== undefined && request.id !== null;
    if (!hasId || typeof request.method !== 'string') {
      return null;
    }

    const id: string | number = request.id as string | number;
    const params: Record<string, unknown> =
      request.params && typeof request.params === 'object' ? request.params : {};

    if (request.method === 'initialize') {
      const requested: unknown = params['protocolVersion'];
      const protocolVersion: string =
        typeof requested === 'string' && mcpSupportedVersions.includes(requested) ? requested : mcpDefaultVersion;

      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion,
          capabilities: { tools: {} },
          serverInfo: mcpServerInfo,
          instructions: mcpInstructions,
        },
      };
    }

    if (request.method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (request.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: mcpTools } };
    }

    if (request.method === 'tools/call') {
      return McpHelper._callTool(id, params, profile);
    }

    return McpHelper.errorBody(id, -32601, `Method not found: ${request.method}`);
  }

  private static _callTool(id: string | number, params: Record<string, unknown>, profile: IMcpProfile): IJsonRpcResponse {
    const name: unknown = params['name'];
    const args: Record<string, unknown> =
      params['arguments'] && typeof params['arguments'] === 'object'
        ? (params['arguments'] as Record<string, unknown>)
        : {};

    if (name === 'get_knowledge_profile') {
      return { jsonrpc: '2.0', id, result: McpHelper._profileTool(profile) };
    }

    if (name === 'check_concepts') {
      const concepts: unknown = args['concepts'];
      if (
        !Array.isArray(concepts) ||
        concepts.length < 1 ||
        concepts.length > mcpMaxConcepts ||
        !concepts.every((entry: unknown) => typeof entry === 'string' && entry.trim().length > 0)
      ) {
        return McpHelper.errorBody(id, -32602, `concepts must be 1 to ${mcpMaxConcepts} non-empty strings`);
      }

      return { jsonrpc: '2.0', id, result: McpHelper._checkTool(concepts as string[], profile) };
    }

    if (name === 'find_gaps') {
      const goal: unknown = args['goal'];
      if (typeof goal !== 'string' || goal.trim().length === 0) {
        return McpHelper.errorBody(id, -32602, 'goal must be a non-empty string');
      }

      return { jsonrpc: '2.0', id, result: McpHelper._gapsTool(goal.trim(), profile) };
    }

    return McpHelper.errorBody(id, -32602, `Unknown tool: ${String(name)}`);
  }

  private static _result(text: string, structuredContent: Record<string, unknown>): IMcpToolResult {
    return { content: [{ type: 'text', text }], structuredContent, isError: false };
  }

  private static _profileTool(profile: IMcpProfile): IMcpToolResult {
    const counts: { known: number; shaky: number } = { known: profile.known.length, shaky: profile.shaky.length };
    const lines: string[] = [];
    if (counts.known + counts.shaky === 0) {
      lines.push(mcpEmptyProfileNote);
    } else {
      lines.push(`Known (${counts.known}): ${profile.known.join('; ') || 'none'}`);
      lines.push(`Shaky (${counts.shaky}): ${profile.shaky.join('; ') || 'none'}`);
    }

    return McpHelper._result(lines.join('\n'), { known: profile.known, shaky: profile.shaky, counts });
  }

  private static _checkTool(concepts: string[], profile: IMcpProfile): IMcpToolResult {
    const mastery: MasteryByConceptKey = McpHelper._mastery(profile);
    const results: { concept: string; status: string }[] = concepts.map((concept: string) => {
      const level: string | undefined = mastery[GraphHelper.conceptKey(concept)];

      return { concept, status: level === 'known' || level === 'shaky' ? level : 'unknown' };
    });
    const lines: string[] = results.map((entry: { concept: string; status: string }) => `${entry.concept}: ${entry.status}`);
    if (profile.known.length + profile.shaky.length === 0) {
      lines.push(mcpEmptyProfileNote);
    }

    return McpHelper._result(lines.join('\n'), { results });
  }

  private static _gapsTool(goal: string, profile: IMcpProfile): IMcpToolResult {
    const mastery: MasteryByConceptKey = McpHelper._mastery(profile);
    const map: IKnowledgeMap | null = McpHelper._matchMap(goal);
    if (!map) {
      const titles: string[] = seededMaps.map((candidate: IKnowledgeMap) => candidate.title);
      const text: string = [
        `No GapMap prerequisite map matches "${goal}". Available maps: ${titles.join('; ')}.`,
        `Learner knows: ${profile.known.join('; ') || 'nothing recorded'}.`,
        `Learner is shaky on: ${profile.shaky.join('; ') || 'nothing recorded'}.`,
        'Reason about the prerequisites yourself, skip what they know, and revisit what is shaky.',
      ].join('\n');

      return McpHelper._result(text, { matched: false, availableMaps: titles, known: profile.known, shaky: profile.shaky });
    }

    const path: ILearningPath = GraphHelper.learningPath(map, map.goalConceptId, mastery);
    const needed: IMcpGapConcept[] = path.steps.map((concept: IConcept) => ({
      title: concept.title,
      summary: concept.summary,
      isShaky: GraphHelper.masteryOf(concept, mastery) === 'shaky',
      prerequisitesKnown: GraphHelper.prerequisitesOf(map, concept.id).every(
        (prerequisite: IConcept) => GraphHelper.masteryOf(prerequisite, mastery) === 'known',
      ),
    }));
    const skip: string[] = path.skipped.map((concept: IConcept) => concept.title);
    const nextStep: string | null = path.nextStep ? path.nextStep.title : null;
    const lines: string[] = [`Goal map: ${map.title}`, 'Still needed, in order:'];
    needed.forEach((entry: IMcpGapConcept, index: number) => {
      const flags: string[] = [];
      if (entry.isShaky) {
        flags.push('shaky');
      }

      if (entry.prerequisitesKnown) {
        flags.push('ready to learn');
      }

      lines.push(`${index + 1}. ${entry.title}${flags.length ? ` (${flags.join(', ')})` : ''}: ${entry.summary}`);
    });
    lines.push(`Can skip (already known): ${skip.join('; ') || 'none'}`);
    lines.push(`Next step: ${nextStep ?? 'none, the learner has covered everything'}`);
    if (profile.known.length + profile.shaky.length === 0) {
      lines.push(mcpEmptyProfileNote);
    }

    return McpHelper._result(lines.join('\n'), { matched: true, map: map.title, needed, skip, nextStep });
  }

  private static _matchMap(goal: string): IKnowledgeMap | null {
    const lowered: string = goal.toLowerCase();
    const goalKey: string = GraphHelper.conceptKey(goal);
    const exact: IKnowledgeMap | undefined = seededMaps.find(
      (map: IKnowledgeMap) => map.id === goalKey || map.title.toLowerCase() === lowered,
    );
    if (exact) {
      return exact;
    }

    const goalWords: Set<string> = McpHelper._words(goal);
    let best: IKnowledgeMap | null = null;
    let bestScore = 0;
    for (const map of seededMaps) {
      const titleWords: Set<string> = McpHelper._words(`${map.id.replace(/-/g, ' ')} ${map.title}`);
      const conceptWords: Set<string> = McpHelper._words(map.concepts.map((concept: IConcept) => concept.title).join(' '));
      let score = 0;
      for (const word of goalWords) {
        if (titleWords.has(word)) {
          score += 3;
        } else if (conceptWords.has(word)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        best = map;
        bestScore = score;
      }
    }

    return best;
  }

  private static _words(text: string): Set<string> {
    const words: string[] = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word: string) => word.length > 1 && !McpHelper._stopWords.has(word));

    return new Set<string>(words);
  }

  private static _mastery(profile: IMcpProfile): MasteryByConceptKey {
    const mastery: MasteryByConceptKey = {};
    for (const title of profile.shaky) {
      mastery[GraphHelper.conceptKey(title)] = 'shaky';
    }

    for (const title of profile.known) {
      mastery[GraphHelper.conceptKey(title)] = 'known';
    }

    return mastery;
  }

  private static _titles(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((entry: unknown): entry is string => typeof entry === 'string')
      .map((entry: string) => entry.trim())
      .filter((entry: string) => entry.length > 0 && entry.length <= mcpMaxTitleLength)
      .slice(0, mcpMaxProfileTitles);
  }
}
