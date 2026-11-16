const gatewayUrl = 'https://ai-gateway.vercel.sh/v1/chat/completions';

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

export class GatewayHelper {
  public static async requestJson<T>(request: Request, modelRequest: IModelRequest<T>): Promise<T> {
    const token = GatewayHelper.resolveToken(request);

    if (!token) {
      throw new Error('AI gateway credentials are missing');
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await GatewayHelper.complete(token, modelRequest);
      const validated = modelRequest.validate(GatewayHelper.parseJson(text));

      if (validated) {
        return validated;
      }
    }

    throw new Error('The model returned an unusable answer twice');
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
