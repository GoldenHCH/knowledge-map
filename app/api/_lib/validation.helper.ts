export interface IApiConcept {
  id: string;
  title: string;
  summary: string;
  prerequisiteIds: string[];
}

export interface IApiKnowledgeMap {
  id: string;
  title: string;
  description: string;
  goalConceptId: string;
  concepts: IApiConcept[];
  isGenerated: boolean;
}

export interface IApiLessonQuestion {
  question: string;
  buildsOnTitle: string;
  hint: string;
  reasoning: string;
}

export interface IApiLesson {
  conceptTitle: string;
  opening: string;
  questions: IApiLessonQuestion[];
  takeaway: string;
  isGenerated: boolean;
}

export interface IApiAnswerReply {
  isOnTrack: boolean;
  reply: string;
}

export interface IApiTranscriptFinding {
  title: string;
  level: 'known' | 'shaky';
  reason: string;
}

export interface IApiTranscriptConcept {
  title: string;
  summary: string;
}

export class ValidationHelper {
  public static readonly maxTranscriptLength: number = 6000;
  public static readonly maxTranscriptConcepts: number = 30;

  public static readonly maxTopicLength: number = 120;
  public static readonly maxAnswerLength: number = 800;
  public static readonly maxTextLength: number = 600;
  public static readonly maxListLength: number = 30;
  public static readonly maxListItemLength: number = 80;

  public static async readBody(request: Request): Promise<Record<string, unknown> | null> {
    try {
      const body: unknown = await request.json();

      return ValidationHelper.isRecord(body) ? body : null;
    } catch {
      return null;
    }
  }

  public static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  public static text(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed: string = value.trim();

    if (trimmed.length === 0 || trimmed.length > maxLength) {
      return null;
    }

    return trimmed;
  }

  public static email(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized: string = value.trim().toLowerCase();

    if (normalized.length === 0 || normalized.length > 254 || /\s/.test(normalized)) {
      return null;
    }

    const parts: string[] = normalized.split('@');

    if (parts.length !== 2 || parts[0].length === 0) {
      return null;
    }

    const domain: string = parts[1];

    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
      return null;
    }

    return normalized;
  }

  public static optionalText(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  public static stringList(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > ValidationHelper.maxListLength) {
      return null;
    }

    const items: string[] = [];

    for (const item of value) {
      const text: string | null = ValidationHelper.text(item, ValidationHelper.maxListItemLength);

      if (text === null) {
        return null;
      }

      items.push(text);
    }

    return items;
  }

  public static slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }

  public static validateMap(value: unknown, topic: string): IApiKnowledgeMap | null {
    if (!ValidationHelper.isRecord(value) || !Array.isArray(value['concepts'])) {
      return null;
    }

    const concepts: IApiConcept[] = ValidationHelper._parseConcepts(value['concepts']);

    if (concepts.length < 8 || concepts.length > 18) {
      return null;
    }

    ValidationHelper._cleanPrerequisites(concepts);

    const goalId: unknown = value['goalConceptId'];
    const goalConceptId: string =
      typeof goalId === 'string' && concepts.some((concept: IApiConcept) => concept.id === goalId)
        ? goalId
        : concepts[concepts.length - 1].id;
    const title: string = ValidationHelper.text(value['title'], 120) ?? topic;
    const description: string = ValidationHelper.text(value['description'], 300) ?? '';

    return {
      id: `generated-${ValidationHelper.slugify(topic) || 'topic'}`,
      title,
      description,
      goalConceptId,
      concepts,
      isGenerated: true,
    };
  }

  public static validateLesson(value: unknown, conceptTitle: string): IApiLesson | null {
    if (!ValidationHelper.isRecord(value) || !Array.isArray(value['questions'])) {
      return null;
    }

    const opening: string | null = ValidationHelper.text(value['opening'], 1000);
    const takeaway: string | null = ValidationHelper.text(value['takeaway'], 1000);

    if (opening === null || takeaway === null || value['questions'].length !== 3) {
      return null;
    }

    const questions: IApiLessonQuestion[] = [];

    for (const raw of value['questions'] as unknown[]) {
      if (!ValidationHelper.isRecord(raw)) {
        return null;
      }

      const question: string | null = ValidationHelper.text(raw['question'], 1000);
      const buildsOnTitle: string | null = ValidationHelper.text(raw['buildsOnTitle'], 100);
      const hint: string | null = ValidationHelper.text(raw['hint'], 1000);
      const reasoning: string | null = ValidationHelper.text(raw['reasoning'], 1500);

      if (question === null || buildsOnTitle === null || hint === null || reasoning === null) {
        return null;
      }

      questions.push({ question, buildsOnTitle, hint, reasoning });
    }

    return { conceptTitle, opening, questions, takeaway, isGenerated: true };
  }

  public static transcriptText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed: string = value.trim().slice(0, ValidationHelper.maxTranscriptLength);

    return trimmed.length > 0 ? trimmed : null;
  }

  public static transcriptConcepts(value: unknown): IApiTranscriptConcept[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const concepts: IApiTranscriptConcept[] = [];

    for (const item of value.slice(0, ValidationHelper.maxTranscriptConcepts)) {
      if (!ValidationHelper.isRecord(item)) {
        continue;
      }

      const title: string | null = ValidationHelper.text(item['title'], 80);
      const summary: string = ValidationHelper.text(item['summary'], 400) ?? '';

      if (title !== null) {
        concepts.push({ title, summary });
      }
    }

    return concepts.length > 0 ? concepts : null;
  }

  public static validateTranscript(value: unknown, concepts: IApiTranscriptConcept[]): IApiTranscriptFinding[] | null {
    if (!ValidationHelper.isRecord(value) || !Array.isArray(value['findings'])) {
      return null;
    }

    const titlesByLowerCase: Map<string, string> = new Map<string, string>(
      concepts.map((concept: IApiTranscriptConcept): [string, string] => [concept.title.toLowerCase(), concept.title]),
    );
    const seen: Set<string> = new Set<string>();
    const findings: IApiTranscriptFinding[] = [];

    for (const raw of value['findings'] as unknown[]) {
      if (!ValidationHelper.isRecord(raw) || typeof raw['title'] !== 'string') {
        continue;
      }

      const title: string | undefined = titlesByLowerCase.get(raw['title'].trim().toLowerCase());
      const level: unknown = raw['level'];
      const reason: string = ValidationHelper.text(raw['reason'], 300) ?? '';

      if (title === undefined || seen.has(title) || (level !== 'known' && level !== 'shaky')) {
        continue;
      }

      seen.add(title);
      findings.push({ title, level, reason });
    }

    return findings;
  }

  public static validateReply(value: unknown): IApiAnswerReply | null {
    if (!ValidationHelper.isRecord(value)) {
      return null;
    }

    const reply: string | null = ValidationHelper.text(value['reply'], 1500);

    if (reply === null || typeof value['isOnTrack'] !== 'boolean') {
      return null;
    }

    return { isOnTrack: value['isOnTrack'], reply };
  }

  private static _parseConcepts(raw: unknown[]): IApiConcept[] {
    const concepts: IApiConcept[] = [];
    const seenIds: Set<string> = new Set<string>();

    for (const item of raw) {
      if (!ValidationHelper.isRecord(item)) {
        continue;
      }

      const title: string | null = ValidationHelper.text(item['title'], 80);
      const id: string = ValidationHelper.slugify(
        typeof item['id'] === 'string' && item['id'].length > 0 ? item['id'] : (title ?? ''),
      );

      if (title === null || id.length === 0 || seenIds.has(id)) {
        continue;
      }

      const summary: string = ValidationHelper.text(item['summary'], 400) ?? '';
      const prerequisiteIds: string[] = Array.isArray(item['prerequisiteIds'])
        ? item['prerequisiteIds']
            .filter((entry: unknown): entry is string => typeof entry === 'string')
            .map((entry: string) => ValidationHelper.slugify(entry))
        : [];

      seenIds.add(id);
      concepts.push({ id, title, summary, prerequisiteIds });
    }

    return concepts;
  }

  private static _cleanPrerequisites(concepts: IApiConcept[]): void {
    const ids: Set<string> = new Set<string>(concepts.map((concept: IApiConcept) => concept.id));
    const accepted: Map<string, string[]> = new Map<string, string[]>();

    for (const concept of concepts) {
      accepted.set(concept.id, []);
    }

    for (const concept of concepts) {
      const unique: string[] = [...new Set<string>(concept.prerequisiteIds)];

      for (const prerequisiteId of unique) {
        if (!ids.has(prerequisiteId) || prerequisiteId === concept.id) {
          continue;
        }

        if (ValidationHelper._reaches(accepted, prerequisiteId, concept.id)) {
          continue;
        }

        accepted.get(concept.id)?.push(prerequisiteId);
      }
    }

    for (const concept of concepts) {
      concept.prerequisiteIds = accepted.get(concept.id) ?? [];
    }
  }

  private static _reaches(edges: Map<string, string[]>, fromId: string, targetId: string): boolean {
    const stack: string[] = [fromId];
    const visited: Set<string> = new Set<string>();

    while (stack.length > 0) {
      const current: string = stack.pop() as string;

      if (current === targetId) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);
      stack.push(...(edges.get(current) ?? []));
    }

    return false;
  }
}
