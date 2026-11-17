import { chatLimits, chatSystemPrompt } from './chat.constants';

export interface IChatMessage {
  role: 'learner' | 'tutor';
  text: string;
}

export interface IChatRequest {
  conceptTitle: string;
  conceptSummary: string;
  goalTitle: string;
  knownTitles: string[];
  shakyTitles: string[];
  contextNote: string;
  messages: IChatMessage[];
}

export class ChatHelper {
  public static parse(body: unknown): IChatRequest | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const record = body as Record<string, unknown>;
    const conceptTitle: string | null = ChatHelper._text(record['conceptTitle'], chatLimits.TITLE);
    const conceptSummary: string | null = ChatHelper._text(record['conceptSummary'], chatLimits.SUMMARY);
    const goalTitle: string | null = ChatHelper._text(record['goalTitle'], chatLimits.TITLE);
    const contextNote: string | null = ChatHelper._text(record['contextNote'], chatLimits.NOTE, true);
    const knownTitles: string[] | null = ChatHelper._list(record['knownTitles']);
    const shakyTitles: string[] | null = ChatHelper._list(record['shakyTitles']);
    const messages: IChatMessage[] | null = ChatHelper._messages(record['messages']);

    if (
      conceptTitle === null ||
      conceptSummary === null ||
      goalTitle === null ||
      contextNote === null ||
      knownTitles === null ||
      shakyTitles === null ||
      messages === null
    ) {
      return null;
    }

    return { conceptTitle, conceptSummary, goalTitle, knownTitles, shakyTitles, contextNote, messages };
  }

  public static system(chat: IChatRequest): string {
    return [
      chatSystemPrompt,
      '',
      `Concept: ${chat.conceptTitle}`,
      `Summary: ${chat.conceptSummary}`,
      `Learner goal: ${chat.goalTitle}`,
      `Already known: ${chat.knownTitles.length > 0 ? chat.knownTitles.join(', ') : 'nothing recorded'}`,
      `Shaky on: ${chat.shakyTitles.length > 0 ? chat.shakyTitles.join(', ') : 'nothing recorded'}`,
      `Quiz question the learner is on: ${chat.contextNote.length > 0 ? chat.contextNote : 'none yet'}`,
    ].join('\n');
  }

  public static turns(chat: IChatRequest): { role: 'user' | 'assistant'; content: string }[] {
    const firstLearner: number = chat.messages.findIndex((message: IChatMessage) => message.role === 'learner');

    return chat.messages.slice(firstLearner).map((message: IChatMessage) => ({
      role: message.role === 'learner' ? 'user' : 'assistant',
      content: message.text,
    }));
  }

  private static _text(value: unknown, max: number, allowEmpty = false): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed: string = value.trim();

    if (trimmed.length > max || (!allowEmpty && trimmed.length === 0)) {
      return null;
    }

    return trimmed;
  }

  private static _list(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > chatLimits.LIST_ITEMS) {
      return null;
    }

    const items: string[] = [];

    for (const entry of value) {
      const item: string | null = ChatHelper._text(entry, chatLimits.LIST_ITEM_LENGTH);

      if (item === null) {
        return null;
      }

      items.push(item);
    }

    return items;
  }

  private static _messages(value: unknown): IChatMessage[] | null {
    if (!Array.isArray(value) || value.length < chatLimits.MIN_MESSAGES || value.length > chatLimits.MAX_MESSAGES) {
      return null;
    }

    const messages: IChatMessage[] = [];

    for (const entry of value) {
      const record = entry as Record<string, unknown> | null;
      const role: unknown = record?.['role'];
      const text: string | null = ChatHelper._text(record?.['text'], chatLimits.MESSAGE_LENGTH);

      if ((role !== 'learner' && role !== 'tutor') || text === null) {
        return null;
      }

      messages.push({ role, text });
    }

    return messages[messages.length - 1].role === 'learner' ? messages : null;
  }
}
