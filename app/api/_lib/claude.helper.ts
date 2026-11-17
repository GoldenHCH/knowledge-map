import Anthropic from '@anthropic-ai/sdk';
import { claudeEffort, claudeFallbackBeta, claudeFallbackModels, claudeLimits, claudeModels } from './claude.constants';

type TClaudeEffort = (typeof claudeEffort)[keyof typeof claudeEffort];

export class ClaudeHelper {
  private static _client: Anthropic | null = null;

  public static isConfigured(): boolean {
    const key: string | undefined = process.env['ANTHROPIC_API_KEY'];

    return typeof key === 'string' && key.trim().length > 0;
  }

  public static async completeText(system: string, prompt: string, maxTokens: number): Promise<string> {
    try {
      const message: Anthropic.Beta.BetaMessage = await ClaudeHelper._getClient().beta.messages.create({
        ...ClaudeHelper._baseParams(system, claudeEffort.JSON, Math.max(maxTokens, claudeLimits.MIN_JSON_TOKENS)),
        messages: [{ role: 'user', content: prompt }],
      });

      return ClaudeHelper._readText(message);
    } catch (error) {
      throw ClaudeHelper._describeError(error);
    }
  }

  public static async streamText(
    system: string,
    messages: Anthropic.MessageParam[],
    onText: (delta: string) => void,
  ): Promise<void> {
    try {
      const stream = ClaudeHelper._getClient().beta.messages.stream({
        ...ClaudeHelper._baseParams(system, claudeEffort.CHAT, claudeLimits.CHAT_TOKENS),
        messages,
      });

      stream.on('text', (delta: string) => onText(delta));

      const message: Anthropic.Beta.BetaMessage = await stream.finalMessage();

      ClaudeHelper._readText(message);
    } catch (error) {
      throw ClaudeHelper._describeError(error);
    }
  }

  private static _getClient(): Anthropic {
    if (!ClaudeHelper._client) {
      ClaudeHelper._client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
    }

    return ClaudeHelper._client;
  }

  private static _baseParams(
    system: string,
    effort: TClaudeEffort,
    maxTokens: number,
  ): Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, 'messages'> {
    const model: string = claudeModels.DEFAULT;
    const params: Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, 'messages'> = {
      model,
      max_tokens: maxTokens,
      system,
      output_config: { effort },
    };

    if (claudeFallbackModels.includes(model)) {
      params.betas = [claudeFallbackBeta];
      params.fallbacks = 'default';
    }

    return params;
  }

  private static _readText(message: Anthropic.Beta.BetaMessage): string {
    if (message.stop_reason === 'refusal') {
      throw new Error(`Claude declined the request (category: ${message.stop_details?.category ?? 'none given'})`);
    }

    const text: string = message.content
      .filter((block: Anthropic.Beta.BetaContentBlock): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block: Anthropic.Beta.BetaTextBlock) => block.text)
      .join('');

    if (text.trim().length === 0) {
      throw new Error('Claude returned an empty answer');
    }

    return text;
  }

  private static _describeError(error: unknown): Error {
    if (error instanceof Anthropic.AuthenticationError) {
      return new Error('Claude rejected the API key');
    }

    if (error instanceof Anthropic.RateLimitError) {
      return new Error('Claude is rate limited');
    }

    if (error instanceof Anthropic.BadRequestError) {
      return new Error(`Claude rejected the request: ${error.message}`);
    }

    if (error instanceof Anthropic.APIConnectionError) {
      return new Error('Could not reach Claude');
    }

    if (error instanceof Anthropic.APIError) {
      return new Error(`Claude API error ${error.status}`);
    }

    return error instanceof Error ? error : new Error('Claude call failed');
  }
}
