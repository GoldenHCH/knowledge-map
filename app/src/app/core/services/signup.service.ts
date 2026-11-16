import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ISignupRequest } from '../../knowledge-map/knowledge-map.interfaces';

@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly _http: HttpClient = inject(HttpClient);

  public async signUp(request: ISignupRequest): Promise<void> {
    try {
      await firstValueFrom(this._http.post<unknown>('/api/signup', request));
    } catch (error) {
      const payload: unknown = (error as { error?: unknown } | null)?.error;
      const serverMessage: unknown = (payload as { error?: unknown } | null)?.error;

      throw new Error(
        typeof serverMessage === 'string' && serverMessage.length > 0
          ? serverMessage
          : "We couldn't save that just now. Please try again.",
      );
    }
  }
}
