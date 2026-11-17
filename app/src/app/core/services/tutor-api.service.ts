import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  IKnowledgeMap,
  ILesson,
  ILessonRequest,
  ITranscriptFinding,
  ITranscriptRequest,
} from '../../knowledge-map/knowledge-map.interfaces';

@Injectable({ providedIn: 'root' })
export class TutorApiService {
  private readonly _http: HttpClient = inject(HttpClient);

  public async generateMap(topic: string): Promise<IKnowledgeMap> {
    return this._post<IKnowledgeMap>('/api/map', { topic }, 'We could not build that map right now.');
  }

  public async generateLesson(request: ILessonRequest): Promise<ILesson> {
    return this._post<ILesson>('/api/lesson', request, 'We could not write that lesson right now.');
  }

  public async readTranscript(request: ITranscriptRequest): Promise<ITranscriptFinding[]> {
    const response: { findings: ITranscriptFinding[] } = await this._post<{ findings: ITranscriptFinding[] }>(
      '/api/transcript',
      request,
      'We could not read that transcript right now.',
    );

    return response.findings;
  }

  private async _post<T>(url: string, body: object, fallbackMessage: string): Promise<T> {
    try {
      return await firstValueFrom(this._http.post<T>(url, body));
    } catch (error) {
      console.error(`request to ${url} failed`, error);

      throw new Error(TutorApiService._messageOf(error, fallbackMessage));
    }
  }

  private static _messageOf(error: unknown, fallbackMessage: string): string {
    const payload: unknown = (error as { error?: unknown } | null)?.error;
    const serverMessage: unknown = (payload as { error?: unknown } | null)?.error;

    return typeof serverMessage === 'string' && serverMessage.length > 0 ? serverMessage : fallbackMessage;
  }
}
