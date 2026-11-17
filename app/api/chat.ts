import { chatMessages } from './_lib/chat.constants';
import { ChatHelper, IChatRequest } from './_lib/chat.helper';
import { GatewayHelper } from './_lib/gateway.helper';

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const chat: IChatRequest | null = ChatHelper.parse(body);

  if (!chat) {
    return GatewayHelper.jsonResponse({ error: chatMessages.INVALID }, 400);
  }

  const encoder = new TextEncoder();
  const system: string = ChatHelper.system(chat);
  const turns = ChatHelper.turns(chat);
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let sentText = false;
  let settle: (failed: boolean) => void = () => undefined;
  const firstSignal = new Promise<boolean>((resolve) => {
    settle = resolve;
  });

  const stream = new ReadableStream<Uint8Array>({
    start(streamController: ReadableStreamDefaultController<Uint8Array>): void {
      controller = streamController;
    },
  });

  GatewayHelper.streamText(request, system, turns, (delta: string) => {
    if (!sentText) {
      sentText = true;
      settle(false);
    }

    controller?.enqueue(encoder.encode(delta));
  })
    .catch((error: unknown) => {
      console.error('chat stream failed', error instanceof Error ? error.message : 'unknown error');

      if (!sentText) {
        settle(true);

        return;
      }
    })
    .finally(() => {
      settle(false);
      controller?.close();
    });

  const failed: boolean = await firstSignal;

  if (failed) {
    return GatewayHelper.jsonResponse({ error: chatMessages.UNAVAILABLE }, 502);
  }

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-gapmap-provider': GatewayHelper.providerName(),
    },
  });
}
