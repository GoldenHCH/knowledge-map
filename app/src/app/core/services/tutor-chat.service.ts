import { Injectable } from '@angular/core';
import { ITutorChatRequest } from '../../knowledge-map/tutor-chat/tutor-chat.interfaces';

const fallbackMessage = 'The tutor is unavailable right now. Please try again.';

@Injectable({ providedIn: 'root' })
export class TutorChatService {
  public async streamReply(request: ITutorChatRequest, onText: (delta: string) => void): Promise<void> {
    let response: Response;

    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch {
      throw new Error(fallbackMessage);
    }

    if (!response.ok || !response.body) {
      throw new Error(await this._readError(response));
    }

    const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();
    const decoder: TextDecoder = new TextDecoder();

    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk: string = decoder.decode(value, { stream: true });

        if (chunk.length > 0) {
          onText(chunk);
        }
      }
    } catch {
      throw new Error(fallbackMessage);
    }
  }

  private async _readError(response: Response): Promise<string> {
    try {
      const payload: unknown = await response.json();
      const message: unknown = (payload as { error?: unknown } | null)?.error;

      return typeof message === 'string' && message.length > 0 ? message : fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
}
