import { ClaudeHelper } from './claude.helper';

const gatewayUrl = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const defaultStreamModel = 'google/gemini-2.5-flash';

export interface IModelRequest<T> {
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  validate: (value: unknown) => T | null;
}

interface IChatCompletion {
  choices?: { message?: { content?: string } }[];
}

interface IChatCompletionChunk {
  choices?: { delta?: { content?: string } }[];
}

export class GatewayHelper {
  public static async requestJson<T>(request: Request, modelRequest: IModelRequest<T>): Promise<T> {
    const useClaude: boolean = ClaudeHelper.isConfigured();
    const token = GatewayHelper.resolveToken(request);

    if (!useClaude && !token) {
      throw new Error('AI gateway credentials are missing');
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const text: string = useClaude
        ? await ClaudeHelper.completeText(modelRequest.system, modelRequest.prompt, modelRequest.maxTokens)
        : await GatewayHelper.complete(token as string, modelRequest);
      const validated = modelRequest.validate(GatewayHelper.parseJson(text));

      if (validated) {
        return validated;
      }
    }

    throw new Error('The model returned an unusable answer twice');
  }

  public static providerName(): 'claude' | 'gateway' {
    return ClaudeHelper.isConfigured() ? 'claude' : 'gateway';
  }

  public static async streamText(
    request: Request,
    system: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    onText: (delta: string) => void,
  ): Promise<void> {
    if (ClaudeHelper.isConfigured()) {
      await ClaudeHelper.streamText(system, messages, onText);

      return;
    }

    const token = GatewayHelper.resolveToken(request);

    if (!token) {
      throw new Error('AI gateway credentials are missing');
    }

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env['GAPMAP_LESSON_MODEL'] ?? defaultStreamModel,
        max_tokens: 1000,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text();

      throw new Error(`AI gateway responded ${response.status}: ${detail.slice(0, 300)}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        GatewayHelper.emitDelta(line, onText);
      }
    }

    GatewayHelper.emitDelta(buffer, onText);
  }

  public static jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  private static resolveToken(request: Request): string | undefined {
    return (
      process.env['AI_GATEWAY_API_KEY'] ??
      request.headers.get('x-vercel-oidc-token') ??
      process.env['VERCEL_OIDC_TOKEN']
    );
  }

  private static async complete<T>(token: string, modelRequest: IModelRequest<T>): Promise<string> {
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelRequest.model,
        max_tokens: modelRequest.maxTokens,
        messages: [
          { role: 'system', content: modelRequest.system },
          { role: 'user', content: modelRequest.prompt },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();

      throw new Error(`AI gateway responded ${response.status}: ${detail.slice(0, 300)}`);
    }

    const completion = (await response.json()) as IChatCompletion;

    return completion.choices?.[0]?.message?.content ?? '';
  }

  private static emitDelta(line: string, onText: (delta: string) => void): void {
    const trimmed = line.trim();

    if (!trimmed.startsWith('data:')) {
      return;
    }

    const payload = trimmed.slice(5).trim();

    if (payload.length === 0 || payload === '[DONE]') {
      return;
    }

    try {
      const chunk = JSON.parse(payload) as IChatCompletionChunk;
      const delta = chunk.choices?.[0]?.delta?.content;

      if (typeof delta === 'string' && delta.length > 0) {
        onText(delta);
      }
    } catch {
      return;
    }
  }

  private static parseJson(text: string): unknown {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
