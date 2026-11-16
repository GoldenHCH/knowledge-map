import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  private readonly _message$ = new BehaviorSubject<string>('');

  public readonly isLoading$: Observable<boolean> = this._isLoading$.asObservable();
  public readonly message$: Observable<string> = this._message$.asObservable();

  public show(message: string): void {
    this._message$.next(message);
    this._isLoading$.next(true);
  }

  public hide(): void {
    this._isLoading$.next(false);
    this._message$.next('');
  }
}
