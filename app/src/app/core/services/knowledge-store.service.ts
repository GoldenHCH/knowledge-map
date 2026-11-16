import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GraphHelper } from '../../knowledge-map/graph.helper';
import { IConcept, IKnowledgeMap } from '../../knowledge-map/knowledge-map.interfaces';
import { MasteryByConceptKey, MasteryLevel } from '../../knowledge-map/knowledge-map.types';

@Injectable({ providedIn: 'root' })
export class KnowledgeStoreService {
  private static readonly _masteryStorageKey: string = 'gapmap.mastery.v1';
  private static readonly _mapsStorageKey: string = 'gapmap.maps.v1';
  private static readonly _maxGeneratedMaps: number = 6;

  private readonly _mastery$: BehaviorSubject<MasteryByConceptKey> = new BehaviorSubject<MasteryByConceptKey>(
    KnowledgeStoreService._read<MasteryByConceptKey>(KnowledgeStoreService._masteryStorageKey, {}),
  );
  private readonly _generatedMaps$: BehaviorSubject<IKnowledgeMap[]> = new BehaviorSubject<IKnowledgeMap[]>(
    KnowledgeStoreService._read<IKnowledgeMap[]>(KnowledgeStoreService._mapsStorageKey, []),
  );

  public readonly mastery$: Observable<MasteryByConceptKey> = this._mastery$.asObservable();
  public readonly generatedMaps$: Observable<IKnowledgeMap[]> = this._generatedMaps$.asObservable();

  public get mastery(): MasteryByConceptKey {
    return this._mastery$.value;
  }

  public setMastery(concepts: IConcept[], level: MasteryLevel): void {
    const next: MasteryByConceptKey = { ...this._mastery$.value };
    for (const concept of concepts) {
      next[GraphHelper.conceptKey(concept.title)] = level;
    }

    this._commitMastery(next);
  }

  public loadSampleLearner(map: IKnowledgeMap): void {
    const next: MasteryByConceptKey = { ...this._mastery$.value };
    for (const concept of map.concepts) {
      let level: MasteryLevel = 'new';
      if (map.sampleLearner?.knownConceptIds.includes(concept.id)) {
        level = 'known';
      } else if (map.sampleLearner?.shakyConceptIds.includes(concept.id)) {
        level = 'shaky';
      }

      next[GraphHelper.conceptKey(concept.title)] = level;
    }

    this._commitMastery(next);
  }

  public resetMastery(): void {
    this._commitMastery({});
  }

  public saveGeneratedMap(map: IKnowledgeMap): void {
    const others: IKnowledgeMap[] = this._generatedMaps$.value.filter(
      (existing: IKnowledgeMap) => existing.id !== map.id,
    );
    const next: IKnowledgeMap[] = [map, ...others].slice(0, KnowledgeStoreService._maxGeneratedMaps);
    KnowledgeStoreService._write(KnowledgeStoreService._mapsStorageKey, next);
    this._generatedMaps$.next(next);
  }

  private _commitMastery(next: MasteryByConceptKey): void {
    KnowledgeStoreService._write(KnowledgeStoreService._masteryStorageKey, next);
    this._mastery$.next(next);
  }

  private static _read<T>(key: string, fallback: T): T {
    try {
      const raw: string | null = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }

      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object') {
        return fallback;
      }

      return parsed as T;
    } catch {
      return fallback;
    }
  }

  private static _write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      return;
    }
  }
}
