import { GatewayHelper } from './_lib/gateway.helper';
import { aiModels, replyPrompts } from './_lib/prompts.constants';
import { IApiAnswerReply, ValidationHelper } from './_lib/validation.helper';

export async function POST(request: Request): Promise<Response> {
  const body: Record<string, unknown> | null = await ValidationHelper.readBody(request);
  const conceptTitle: string | null = body
    ? ValidationHelper.text(body['conceptTitle'], ValidationHelper.maxTopicLength)
    : null;
  const question: string | null = body ? ValidationHelper.text(body['question'], 1000) : null;
  const reasoning: string | null = body ? ValidationHelper.text(body['reasoning'], 1500) : null;
  const learnerAnswer: string | null = body
    ? ValidationHelper.text(body['learnerAnswer'], ValidationHelper.maxAnswerLength)
    : null;
  const knownTitles: string[] | null = body ? ValidationHelper.stringList(body['knownTitles']) : null;

  if (!conceptTitle || !question || !reasoning || !learnerAnswer || !knownTitles) {
    return GatewayHelper.jsonResponse({ error: 'Write an answer of up to 800 characters first.' }, 400);
  }

  const prompt: string = [
    `Concept being taught: ${conceptTitle}`,
    `Question: ${question}`,
    `Stored reasoning of a good answer: ${reasoning}`,
    `Concepts the learner knows: ${knownTitles.length > 0 ? knownTitles.join('; ') : 'none'}`,
    `Learner's answer: ${learnerAnswer}`,
  ].join('\n');

  try {
    const reply: IApiAnswerReply = await GatewayHelper.requestJson<IApiAnswerReply>(request, {
      model: aiModels.TUTORIAL,
      system: replyPrompts.SYSTEM,
      prompt,
      maxTokens: 1200,
      validate: (value: unknown) => ValidationHelper.validateReply(value),
    });

    return GatewayHelper.jsonResponse(reply);
  } catch (error) {
    console.error('reply failed', error);

    return GatewayHelper.jsonResponse({ error: 'We could not read your answer right now.' }, 502);
  }
}
