import { GatewayHelper } from './_lib/gateway.helper';
import { ValidationHelper } from './_lib/validation.helper';

const saveFailedMessage: string = "We couldn't save that just now. Please try again.";

export async function POST(request: Request): Promise<Response> {
  const body: Record<string, unknown> | null = await ValidationHelper.readBody(request);
  const email: string | null = body ? ValidationHelper.email(body['email']) : null;

  if (email === null || body === null) {
    return GatewayHelper.jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }

  const goal: string = ValidationHelper.optionalText(body['goal'], ValidationHelper.maxTopicLength);
  const supabaseUrl: string | undefined = process.env['SUPABASE_URL'];
  const supabaseKey: string | undefined = process.env['SUPABASE_PUBLISHABLE_KEY'];

  if (!supabaseUrl || !supabaseKey) {
    return GatewayHelper.jsonResponse({ error: "Sign-ups aren't open yet. Please check back soon." }, 503);
  }

  try {
    const response: Response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/signups`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, goal, source: 'landing' }),
    });

    if (response.ok || response.status === 409) {
      return GatewayHelper.jsonResponse({ ok: true });
    }

    console.error('signup storage failed', response.status, await response.text());
  } catch (error) {
    console.error('signup storage unreachable', error instanceof Error ? error.name : 'unknown');
  }

  return GatewayHelper.jsonResponse({ error: saveFailedMessage }, 502);
}
