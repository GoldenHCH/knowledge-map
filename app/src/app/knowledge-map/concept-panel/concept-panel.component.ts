import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { KnowledgeStoreService } from '../../core/services/knowledge-store.service';
import { TutorApiService } from '../../core/services/tutor-api.service';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';
import { GraphHelper } from '../graph.helper';
import {
  IAnswerReply,
  IConcept,
  ILessonVideo,
  IKnowledgeMap,
  ILesson,
  ILessonQuestion,
} from '../knowledge-map.interfaces';
import { MasteryByConceptKey, MasteryLevel } from '../knowledge-map.types';
import { seededLessons } from '../lesson.constants';
import { lessonVideos } from '../media.constants';

export interface IPrerequisiteRow {
  concept: IConcept;
  level: MasteryLevel;
}

export interface IMasteryChoice {
  level: MasteryLevel;
  label: string;
}

export interface IDialogueTurn {
  role: 'tutor' | 'learner';
  text: string;
  tag?: string;
  label?: string;
}

@Component({
  selector: 'app-concept-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
  ],
  templateUrl: './concept-panel.component.html',
  styleUrl: './concept-panel.component.scss',
})
export class ConceptPanelComponent implements OnInit, OnChanges, OnDestroy {
  @Input() public map!: IKnowledgeMap;
  @Input() public concept!: IConcept;
  @Input() public goalConceptId: string = '';
  @Output() public conceptRequested: EventEmitter<IConcept> = new EventEmitter<IConcept>();
  @Output() public goalChosen: EventEmitter<IConcept> = new EventEmitter<IConcept>();
  @Output() public closed: EventEmitter<void> = new EventEmitter<void>();

  public readonly masteryChoices: IMasteryChoice[] = [
    { level: 'new', label: 'New to me' },
    { level: 'shaky', label: 'Shaky' },
    { level: 'known', label: 'I know this' },
  ];

  public mastery: MasteryByConceptKey = {};
  public isLessonStarting: boolean = false;
  public lesson: ILesson | null = null;
  public questionIndex: number = 0;
  public turns: IDialogueTurn[] = [];
  public answerText: string = '';
  public isSending: boolean = false;
  public isHintShown: boolean = false;
  public isReasoningShown: boolean = false;
  public isQuestionDone: boolean = false;
  public isLessonFinished: boolean = false;
  public errorMessage: string = '';
  public prerequisitesMarkedNote: boolean = false;

  private readonly _store: KnowledgeStoreService = inject(KnowledgeStoreService);
  private readonly _api: TutorApiService = inject(TutorApiService);
  private _subscription: Subscription | null = null;
  private static readonly _maxOffTrackAttempts: number = 2;
  private _lessonToken: number = 0;
  private _offTrackAttempts: number = 0;

  public ngOnInit(): void {
    this._subscription = this._store.mastery$.subscribe((mastery: MasteryByConceptKey) => {
      this.mastery = mastery;
    });
  }

  public ngOnChanges(): void {
    this._lessonToken++;
    this._resetLessonState();
    this.prerequisitesMarkedNote = false;
  }

  public ngOnDestroy(): void {
    this._subscription?.unsubscribe();
  }

  public get currentLevel(): MasteryLevel {
    return GraphHelper.masteryOf(this.concept, this.mastery);
  }

  public get prerequisiteRows(): IPrerequisiteRow[] {
    return GraphHelper.prerequisitesOf(this.map, this.concept.id).map((concept: IConcept) => ({
      concept,
      level: GraphHelper.masteryOf(concept, this.mastery),
    }));
  }

  public get missingPrerequisites(): IConcept[] {
    return GraphHelper.missingPrerequisitesOf(this.map, this.concept.id, this.mastery);
  }

  public get warningText(): string {
    const missing: IConcept[] = this.missingPrerequisites;
    const count: number = missing.length;
    const names: string = missing.map((item: IConcept) => item.title).join(', ');

    return `You're missing ${count} ${count === 1 ? 'thing' : 'things'} this lesson builds on: ${names}. Start with ${missing[0].title}.`;
  }

  public get lessonVideo(): ILessonVideo | null {
    return lessonVideos[GraphHelper.conceptKey(this.concept.title)] ?? null;
  }

  public get isGoal(): boolean {
    return this.concept.id === this.goalConceptId;
  }

  public get isLessonActive(): boolean {
    return this.isLessonStarting || this.lesson !== null;
  }

  public get currentQuestion(): ILessonQuestion | null {
    return this.lesson ? (this.lesson.questions[this.questionIndex] ?? null) : null;
  }

  public get questionCount(): number {
    return this.lesson ? this.lesson.questions.length : 0;
  }

  public get isLastQuestion(): boolean {
    return this.questionIndex >= this.questionCount - 1;
  }

  public get builtOnTitles(): string[] {
    if (!this.lesson) {
      return [];
    }

    return [...new Set<string>(this.lesson.questions.map((question: ILessonQuestion) => question.buildsOnTitle))];
  }

  public get hasFallbackReply(): boolean {
    const last: IDialogueTurn | undefined = this.turns[this.turns.length - 1];

    return last !== undefined && last.label !== undefined;
  }

  public get canSend(): boolean {
    return this.answerText.trim().length > 0 && !this.isSending;
  }

  public onChooseMastery(level: MasteryLevel): void {
    this._store.setMastery([this.concept], level);
    this.prerequisitesMarkedNote = false;

    if (level === 'known') {
      const prerequisites: IConcept[] = GraphHelper.allPrerequisitesOf(this.map, this.concept.id);

      if (prerequisites.length > 0) {
        this._store.setMastery(prerequisites, 'known');
        this.prerequisitesMarkedNote = true;
      }
    }
  }

  public onOpenConcept(concept: IConcept): void {
    this.conceptRequested.emit(concept);
  }

  public onChooseGoal(): void {
    this.goalChosen.emit(this.concept);
  }

  public async onStartLesson(): Promise<void> {
    const token: number = ++this._lessonToken;
    this.errorMessage = '';
    this.isLessonStarting = true;

    const lesson: ILesson = await this._resolveLesson();

    if (token !== this._lessonToken) {
      return;
    }

    this.lesson = lesson;
    this.isLessonStarting = false;
    this._presentQuestion();
  }

  public onToggleHint(): void {
    this.isHintShown = true;
  }

  public onShowReasoning(): void {
    this.isReasoningShown = true;
    this.isQuestionDone = true;
  }

  public async onCheckThinking(): Promise<void> {
    const question: ILessonQuestion | null = this.currentQuestion;

    if (!question || !this.canSend) {
      return;
    }

    const token: number = this._lessonToken;
    const answer: string = this.answerText.trim();
    this.turns = [...this.turns, { role: 'learner', text: answer }];
    this.answerText = '';
    this.isSending = true;

    try {
      const reply: IAnswerReply = await this._api.replyToAnswer({
        conceptTitle: this.concept.title,
        question: question.question,
        reasoning: question.reasoning,
        learnerAnswer: answer,
        knownTitles: this._knownTitles(),
      });

      if (token !== this._lessonToken) {
        return;
      }

      this.turns = [...this.turns, { role: 'tutor', text: reply.reply }];

      if (!reply.isOnTrack) {
        this._offTrackAttempts++;
        this.isSending = false;

        if (this._offTrackAttempts >= ConceptPanelComponent._maxOffTrackAttempts) {
          this.turns = [
            ...this.turns,
            { role: 'tutor', text: question.reasoning, label: "Here's the line of thought:" },
          ];
          this.isReasoningShown = true;
          this.isQuestionDone = true;
        }

        return;
      }
    } catch {
      if (token !== this._lessonToken) {
        return;
      }

      this.turns = [...this.turns, { role: 'tutor', text: question.reasoning, label: "Here's the line of thought:" }];
      this.isReasoningShown = true;
    }

    this.isSending = false;
    this.isReasoningShown = true;
    this.isQuestionDone = true;
  }

  public onNextQuestion(): void {
    if (this.isLastQuestion) {
      this.isLessonFinished = true;

      return;
    }

    this.questionIndex++;
    this._presentQuestion();
  }

  public onMarkLearned(): void {
    this._store.setMastery([this.concept], 'known');
    this.closed.emit();
  }

  public onStillShaky(): void {
    this._store.setMastery([this.concept], 'shaky');
    this.closed.emit();
  }

  public onDismissError(): void {
    this.errorMessage = '';
  }

  private _resetLessonState(): void {
    this.isLessonStarting = false;
    this.lesson = null;
    this.questionIndex = 0;
    this.turns = [];
    this.answerText = '';
    this.isSending = false;
    this.isHintShown = false;
    this.isReasoningShown = false;
    this.isQuestionDone = false;
    this._offTrackAttempts = 0;
    this.isLessonFinished = false;
    this.errorMessage = '';
  }

  private _presentQuestion(): void {
    const question: ILessonQuestion | null = this.currentQuestion;

    this.answerText = '';
    this.isHintShown = false;
    this.isReasoningShown = false;
    this.isQuestionDone = false;
    this._offTrackAttempts = 0;

    if (question) {
      this.turns = [
        ...this.turns,
        { role: 'tutor', text: question.question, tag: `Starts from: ${question.buildsOnTitle}` },
      ];
    }
  }

  private _knownTitles(): string[] {
    return GraphHelper.allPrerequisitesOf(this.map, this.concept.id)
      .filter((item: IConcept) => GraphHelper.masteryOf(item, this.mastery) === 'known')
      .map((item: IConcept) => item.title)
      .slice(0, 20);
  }

  private _titlesWithLevel(level: MasteryLevel): string[] {
    return GraphHelper.allPrerequisitesOf(this.map, this.concept.id)
      .filter((item: IConcept) => GraphHelper.masteryOf(item, this.mastery) === level)
      .map((item: IConcept) => item.title);
  }

  private async _resolveLesson(): Promise<ILesson> {
    const knownTitles: string[] = this._knownTitles();
    const seeded: ILesson | undefined = seededLessons[GraphHelper.conceptKey(this.concept.title)];

    if (seeded && seeded.questions.every((question: ILessonQuestion) => knownTitles.includes(question.buildsOnTitle))) {
      return seeded;
    }

    const goal: IConcept | undefined = this.map.concepts.find((item: IConcept) => item.id === this.goalConceptId);

    try {
      return await this._api.generateLesson({
        goalTitle: goal ? goal.title : this.concept.title,
        conceptTitle: this.concept.title,
        conceptSummary: this.concept.summary,
        knownTitles,
        shakyTitles: this._titlesWithLevel('shaky').slice(0, 20),
        missingTitles: this._titlesWithLevel('new').slice(0, 20),
      });
    } catch {
      return seeded ?? this._buildLocalLesson(knownTitles);
    }
  }

  private _buildLocalLesson(knownTitles: string[]): ILesson {
    const prerequisites: string[] =
      knownTitles.length > 0
        ? knownTitles
        : GraphHelper.prerequisitesOf(this.map, this.concept.id).map((item: IConcept) => item.title);
    const anchors: string[] = prerequisites.length > 0 ? prerequisites : ['Everyday experience'];
    const anchorAt: (index: number) => string = (index: number): string => anchors[index % anchors.length];
    const summary: string = this.concept.summary;
    const title: string = this.concept.title;

    return {
      conceptTitle: title,
      isGenerated: false,
      opening:
        knownTitles.length > 0
          ? `You already know ${knownTitles.join(', ')}. This lesson builds ${title} on top of that.`
          : `Let's work out ${title} step by step, starting from what you already notice in everyday life.`,
      questions: [
        {
          question: `In your own words, how might ${anchorAt(0)} lead to ${title}?`,
          buildsOnTitle: anchorAt(0),
          hint: `Think about what ${anchorAt(0)} lets you do that you could not do before.`,
          reasoning: summary,
        },
        {
          question: `Pick a small concrete example. Where would ${title} show up, and what part of ${anchorAt(1)} does it rely on?`,
          buildsOnTitle: anchorAt(1),
          hint: 'Use real numbers or a tiny scenario, and say what changes at each step.',
          reasoning: summary,
        },
        {
          question: `Now put it together: what does ${title} give you that ${anchorAt(2)} alone does not?`,
          buildsOnTitle: anchorAt(2),
          hint: 'Compare what you could answer before with what you can answer now.',
          reasoning: summary,
        },
      ],
      takeaway: summary,
    };
  }
}
