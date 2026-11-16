import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { KnowledgeStoreService } from '../../core/services/knowledge-store.service';
import { SidePanelComponent } from '../../shared/components/side-panel/side-panel.component';
import { ConceptPanelComponent } from '../concept-panel/concept-panel.component';
import { GraphHelper } from '../graph.helper';
import { IConcept, IKnowledgeMap, ILearningPath, IMapLayout, IPositionedConcept } from '../knowledge-map.interfaces';
import { TranscriptImportComponent } from '../transcript-import/transcript-import.component';
import { MasteryByConceptKey, MasteryLevel } from '../knowledge-map.types';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, SidePanelComponent, ConceptPanelComponent, TranscriptImportComponent],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss',
})
export class MapViewComponent implements OnInit, OnChanges, OnDestroy {
  private readonly _knowledgeStore = inject(KnowledgeStoreService);
  private _subscription: Subscription | null = null;
  private _mastery: MasteryByConceptKey = {};
  private _pathIds = new Set<string>();

  @Input({ required: true }) public map!: IKnowledgeMap;
  @Output() public backRequested = new EventEmitter<void>();

  public layout: IMapLayout | null = null;
  public learningPath: ILearningPath | null = null;
  public goalConceptId = '';
  public selectedConcept: IConcept | null = null;
  public hasAnyKnown = false;
  public isImportOpen = false;

  public ngOnInit(): void {
    this._subscription = this._knowledgeStore.mastery$.subscribe((mastery) => {
      this._mastery = mastery;
      this._recompute();
    });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['map'] && this.map) {
      this.goalConceptId = this.map.goalConceptId;
      this.selectedConcept = null;
      this.layout = GraphHelper.layout(this.map);
      this._recompute();
    }
  }

  public ngOnDestroy(): void {
    this._subscription?.unsubscribe();
  }

  public get goalTitle(): string {
    return this.learningPath?.goal.title ?? '';
  }

  public get pathSummary(): string {
    const path = this.learningPath;

    if (!path) {
      return '';
    }

    const lessons = `${path.steps.length} ${path.steps.length === 1 ? 'lesson' : 'lessons'}`;

    if (!path.skipped.length) {
      return lessons;
    }

    return `${lessons} · skipping ${path.skipped.length} you already know`;
  }

  public masteryOf(concept: IConcept): MasteryLevel {
    return GraphHelper.masteryOf(concept, this._mastery);
  }

  public isOnPath(conceptId: string): boolean {
    return this._pathIds.has(conceptId);
  }

  public isNextStep(conceptId: string): boolean {
    return this.learningPath?.nextStep?.id === conceptId;
  }

  public isEdgeOnPath(fromId: string, toId: string): boolean {
    return this._pathIds.has(fromId) && this._pathIds.has(toId);
  }

  public isLocked(concept: IConcept): boolean {
    return GraphHelper.prerequisitesOf(this.map, concept.id).some(
      (prerequisite) => GraphHelper.masteryOf(prerequisite, this._mastery) !== 'known',
    );
  }

  public titleLineY(node: IPositionedConcept, lineIndex: number): number {
    const lineHeight = 16;
    const lineCount = node.titleLines.length;
    const nodeHeight = this.layout?.nodeHeight ?? 0;
    const firstLineY = node.y + nodeHeight / 2 - ((lineCount - 1) * lineHeight) / 2;

    return firstLineY + lineIndex * lineHeight;
  }

  public selectConcept(concept: IConcept): void {
    this.isImportOpen = false;
    this.selectedConcept = concept;
  }

  public onConceptRequested(concept: IConcept): void {
    this.isImportOpen = false;
    this.selectedConcept = concept;
  }

  public onGoalChosen(concept: IConcept): void {
    this.goalConceptId = concept.id;
    this._recompute();
  }

  public openImport(): void {
    this.selectedConcept = null;
    this.isImportOpen = true;
  }

  public closeImport(): void {
    this.isImportOpen = false;
  }

  public closePanel(): void {
    this.selectedConcept = null;
  }

  public loadSampleLearner(): void {
    this._knowledgeStore.loadSampleLearner(this.map);
  }

  public resetMastery(): void {
    this._knowledgeStore.resetMastery();
  }

  public goBack(): void {
    this.backRequested.emit();
  }

  private _recompute(): void {
    if (!this.map) {
      return;
    }

    this.learningPath = GraphHelper.learningPath(this.map, this.goalConceptId, this._mastery);
    this._pathIds = new Set(this.learningPath.steps.map((step) => step.id));
    this.hasAnyKnown = this.map.concepts.some(
      (concept) => GraphHelper.masteryOf(concept, this._mastery) !== 'new',
    );
  }
}
