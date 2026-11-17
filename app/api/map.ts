import { GatewayHelper } from './_lib/gateway.helper';
import { aiModels, mapPrompts } from './_lib/prompts.constants';
import { IApiKnowledgeMap, ValidationHelper } from './_lib/validation.helper';

export async function POST(request: Request): Promise<Response> {
  const body: Record<string, unknown> | null = await ValidationHelper.readBody(request);
  const topic: string | null = body ? ValidationHelper.text(body['topic'], ValidationHelper.maxTopicLength) : null;

  if (topic === null) {
    return GatewayHelper.jsonResponse(
      { error: `Give a topic of up to ${ValidationHelper.maxTopicLength} characters.` },
      400,
    );
  }

  try {
    const map: IApiKnowledgeMap = await GatewayHelper.requestJson<IApiKnowledgeMap>(request, {
      model: aiModels.MAP,
      system: mapPrompts.SYSTEM,
      prompt: `Learning goal: ${topic}`,
      maxTokens: 8000,
      validate: (value: unknown) => ValidationHelper.validateMap(value, topic),
    });

    return GatewayHelper.jsonResponse(map);
  } catch (error) {
    console.error('map generation failed', error);

    return GatewayHelper.jsonResponse({ error: 'We could not build that map right now. Try again or pick a ready-made map.' }, 502);
  }
}
