import { GatewayHelper } from './_lib/gateway.helper';
import { aiModels, lessonPrompts } from './_lib/prompts.constants';
import { IApiLesson, ValidationHelper } from './_lib/validation.helper';

function describeList(label: string, titles: string[]): string {
  return `${label}: ${titles.length > 0 ? titles.join('; ') : 'none'}`;
}

export async function POST(request: Request): Promise<Response> {
  const body: Record<string, unknown> | null = await ValidationHelper.readBody(request);
  const goalTitle: string | null = body ? ValidationHelper.text(body['goalTitle'], ValidationHelper.maxTopicLength) : null;
  const conceptTitle: string | null = body
    ? ValidationHelper.text(body['conceptTitle'], ValidationHelper.maxTopicLength)
    : null;
  const conceptSummary: string | null = body
    ? ValidationHelper.text(body['conceptSummary'], ValidationHelper.maxTextLength)
    : null;
  const knownTitles: string[] | null = body ? ValidationHelper.stringList(body['knownTitles']) : null;
  const shakyTitles: string[] | null = body ? ValidationHelper.stringList(body['shakyTitles']) : null;
  const missingTitles: string[] | null = body ? ValidationHelper.stringList(body['missingTitles']) : null;

  if (!goalTitle || !conceptTitle || !conceptSummary || !knownTitles || !shakyTitles || !missingTitles) {
    return GatewayHelper.jsonResponse({ error: 'The lesson request was incomplete.' }, 400);
  }

  const prompt: string = [
    `Learner's goal: ${goalTitle}`,
    `Concept to teach: ${conceptTitle}`,
    `Summary: ${conceptSummary}`,
    describeList('Known', knownTitles),
    describeList('Shaky', shakyTitles),
    describeList('Missing', missingTitles),
  ].join('\n');

  try {
    const lesson: IApiLesson = await GatewayHelper.requestJson<IApiLesson>(request, {
      model: aiModels.TUTORIAL,
      system: lessonPrompts.SYSTEM,
      prompt,
      maxTokens: 4000,
      validate: (value: unknown) => ValidationHelper.validateLesson(value, conceptTitle),
    });

    return GatewayHelper.jsonResponse(lesson);
  } catch (error) {
    console.error('lesson generation failed', error);

    return GatewayHelper.jsonResponse({ error: 'We could not write that lesson right now.' }, 502);
  }
}
