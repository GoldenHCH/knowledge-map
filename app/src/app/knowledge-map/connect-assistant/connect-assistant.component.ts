import { Component, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription, combineLatest } from 'rxjs';
import { KnowledgeStoreService } from '../../core/services/knowledge-store.service';
import { GraphHelper } from '../graph.helper';
import { IKnowledgeMap } from '../knowledge-map.interfaces';
import { seededMaps } from '../knowledge-map.constants';
import { MasteryByConceptKey } from '../knowledge-map.types';
import { ProfileLinkHelper } from '../profile-link.helper';

@Component({
  selector: 'app-connect-assistant',
  standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './connect-assistant.component.html',
  styleUrl: './connect-assistant.component.scss',
})
export class ConnectAssistantComponent implements OnDestroy {
  private readonly _knowledgeStore = inject(KnowledgeStoreService);
  private readonly _subscription: Subscription;
  private _copiedTimer: ReturnType<typeof setTimeout> | null = null;

  public connectorUrl = '';
  public knownCount = 0;
  public shakyCount = 0;
  public isCopied = false;

  public constructor() {
    this._subscription = combineLatest([this._knowledgeStore.mastery$, this._knowledgeStore.generatedMaps$]).subscribe(
      ([mastery, generatedMaps]: [MasteryByConceptKey, IKnowledgeMap[]]) => {
        this._refresh(mastery, generatedMaps);
      },
    );
  }

  public ngOnDestroy(): void {
    this._subscription.unsubscribe();
    if (this._copiedTimer) {
      clearTimeout(this._copiedTimer);
    }
  }

  public async onCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.connectorUrl);
      this.isCopied = true;
      if (this._copiedTimer) {
        clearTimeout(this._copiedTimer);
      }

      this._copiedTimer = setTimeout(() => {
        this.isCopied = false;
      }, 2000);
    } catch {
      this.isCopied = false;
    }
  }

  private _refresh(mastery: MasteryByConceptKey, generatedMaps: IKnowledgeMap[]): void {
    const titlesByKey: Record<string, string> = {};
    for (const map of [...seededMaps, ...generatedMaps]) {
      for (const concept of map.concepts) {
        titlesByKey[GraphHelper.conceptKey(concept.title)] = concept.title;
      }
    }

    const levels: string[] = Object.values(mastery);
    this.knownCount = levels.filter((level: string) => level === 'known').length;
    this.shakyCount = levels.filter((level: string) => level === 'shaky').length;
    this.connectorUrl = ProfileLinkHelper.connectorUrl(
      window.location.origin,
      ProfileLinkHelper.encodeProfile(mastery, titlesByKey),
    );
  }
}
