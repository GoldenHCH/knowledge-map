import { GatewayHelper } from './_lib/gateway.helper';
import { aiModels, transcriptPrompts } from './_lib/prompts.constants';
import { IApiTranscriptConcept, IApiTranscriptFinding, ValidationHelper } from './_lib/validation.helper';

export async function POST(request: Request): Promise<Response> {
  const body: Record<string, unknown> | null = await ValidationHelper.readBody(request);
  const transcript: string | null = body ? ValidationHelper.transcriptText(body['transcript']) : null;
  const concepts: IApiTranscriptConcept[] | null = body ? ValidationHelper.transcriptConcepts(body['concepts']) : null;

  if (!transcript || !concepts) {
    return GatewayHelper.jsonResponse({ error: 'The transcript request was incomplete.' }, 400);
  }

  const prompt: string = [
    'Concepts:',
    ...concepts.map((concept: IApiTranscriptConcept) => `- ${concept.title}: ${concept.summary}`),
    '',
    'Learner document:',
    transcript,
  ].join('\n');

  try {
    const findings: IApiTranscriptFinding[] = await GatewayHelper.requestJson<IApiTranscriptFinding[]>(request, {
      model: aiModels.TUTORIAL,
      system: transcriptPrompts.SYSTEM,
      prompt,
      maxTokens: 4000,
      validate: (value: unknown) => ValidationHelper.validateTranscript(value, concepts),
    });

    return GatewayHelper.jsonResponse({ findings });
  } catch (error) {
    console.error('transcript reading failed', error);

    return GatewayHelper.jsonResponse({ error: 'We could not read that transcript right now.' }, 502);
  }
}
