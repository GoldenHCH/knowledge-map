import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KnowledgeStoreService } from '../../core/services/knowledge-store.service';
import { TutorApiService } from '../../core/services/tutor-api.service';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';
import { IConcept, IKnowledgeMap, ISampleTranscript, ITranscriptFinding } from '../knowledge-map.interfaces';
import { MasteryLevel } from '../knowledge-map.types';
import { sampleTranscripts } from '../transcript.constants';
import { ITranscriptRow } from './transcript-import.interfaces';

@Component({
  selector: 'app-transcript-import',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
  ],
  templateUrl: './transcript-import.component.html',
  styleUrl: './transcript-import.component.scss',
})
export class TranscriptImportComponent {
  private readonly _knowledgeStore: KnowledgeStoreService = inject(KnowledgeStoreService);
  private readonly _tutorApi: TutorApiService = inject(TutorApiService);

  @Input({ required: true }) public map!: IKnowledgeMap;
  @Output() public closed: EventEmitter<void> = new EventEmitter<void>();

  public readonly samples: ISampleTranscript[] = sampleTranscripts;
  public text: string = '';
  public isLoading: boolean = false;
  public errorMessage: string = '';
  public rows: ITranscriptRow[] | null = null;

  public get canSubmit(): boolean {
    return this.text.trim().length > 0 && !this.isLoading;
  }

  public get hasTicked(): boolean {
    return (this.rows ?? []).some((row: ITranscriptRow) => row.isTicked);
  }

  public get summary(): string {
    return `We found evidence for ${this.rows?.length ?? 0} of ${this.map.concepts.length} concepts.`;
  }

  public useSample(sample: ISampleTranscript): void {
    this.text = sample.text;
  }

  public onFileChosen(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];

    if (!file) {
      return;
    }

    const reader: FileReader = new FileReader();

    reader.onload = (): void => {
      this.text = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.onerror = (): void => {
      this.errorMessage = 'We could not read that file.';
    };
    reader.readAsText(file);
    input.value = '';
  }

  public async submit(): Promise<void> {
    if (!this.canSubmit) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const findings: ITranscriptFinding[] = await this._tutorApi.readTranscript({
        transcript: this.text,
        concepts: this.map.concepts.map((concept: IConcept) => ({ title: concept.title, summary: concept.summary })),
      });

      this.rows = findings.map((finding: ITranscriptFinding) => ({ finding, isTicked: true }));
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'We could not read that transcript right now.';
    } finally {
      this.isLoading = false;
    }
  }

  public back(): void {
    this.rows = null;
  }

  public dismissError(): void {
    this.errorMessage = '';
  }

  public levelLabel(level: MasteryLevel): string {
    return level === 'known' ? 'Known' : 'Shaky';
  }

  public confirm(): void {
    this._apply('known');
    this._apply('shaky');
    this.closed.emit();
  }

  private _apply(level: MasteryLevel): void {
    const titles: Set<string> = new Set<string>(
      (this.rows ?? [])
        .filter((row: ITranscriptRow) => row.isTicked && row.finding.level === level)
        .map((row: ITranscriptRow) => row.finding.title),
    );
    const concepts: IConcept[] = this.map.concepts.filter((concept: IConcept) => titles.has(concept.title));

    if (concepts.length > 0) {
      this._knowledgeStore.setMastery(concepts, level);
    }
  }
}
