import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { KnowledgeStoreService } from '../../core/services/knowledge-store.service';
import { TutorApiService } from '../../core/services/tutor-api.service';
import { AlertBannerComponent } from '../../shared/components/alert-banner/alert-banner.component';
import { GraphHelper } from '../graph.helper';
import {
  ILessonChoice,
  IConcept,
  ILessonVideo,
  IKnowledgeMap,
  ILesson,
  ILessonQuestion,
} from '../knowledge-map.interfaces';
import { MasteryByConceptKey, MasteryLevel } from '../knowledge-map.types';
import { seededLessons } from '../lesson.constants';
import { LessonHelper } from '../lesson.helper';
import { lessonVideos } from '../media.constants';
import { TutorChatComponent } from '../tutor-chat/tutor-chat.component';

export interface IPrerequisiteRow {
  concept: IConcept;
  level: MasteryLevel;
}

export interface IMasteryChoice {
  level: MasteryLevel;
  label: string;
}


@Component({
  selector: 'app-concept-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
    TutorChatComponent,
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
  public options: ILessonChoice[] = [];
  public triedChoices: ILessonChoice[] = [];
  public blankText: string = '';
  public blankMisses: number = 0;
  public isBlankShaking: boolean = false;
  public isHintShown: boolean = false;
  public isQuestionDone: boolean = false;
  public isAnswerRevealed: boolean = false;
  public isLessonFinished: boolean = false;
  public isChatOpen: boolean = false;
  public firstTryCorrectCount: number = 0;
  public errorMessage: string = '';
  public prerequisitesMarkedNote: boolean = false;

  private readonly _store: KnowledgeStoreService = inject(KnowledgeStoreService);
  private readonly _api: TutorApiService = inject(TutorApiService);
  private _subscription: Subscription | null = null;
  private static readonly _maxBlankMisses: number = 2;
  private _lessonToken: number = 0;
  private _isFirstTryLost: boolean = false;

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

  public get canCheckBlank(): boolean {
    return this.blankText.trim().length > 0 && !this.isQuestionDone;
  }

  public get blankParts(): string[] {
    const question: ILessonQuestion | null = this.currentQuestion;

    return question ? question.prompt.split('___') : [];
  }

  public get blankFeedbackVisible(): boolean {
    return this.blankMisses > 0 && !this.isQuestionDone;
  }

  public get acceptedAnswerText(): string {
    const question: ILessonQuestion | null = this.currentQuestion;

    return question && question.acceptedAnswers.length > 0 ? question.acceptedAnswers[0] : '';
  }

  public get chatContextNote(): string {
    if (this.isLessonFinished && this.lesson) {
      return this.lesson.takeaway;
    }

    return this.currentQuestion ? this.currentQuestion.prompt : '';
  }

  public get goalTitle(): string {
    const goal: IConcept | undefined = this.map.concepts.find((item: IConcept) => item.id === this.goalConceptId);

    return goal ? goal.title : this.concept.title;
  }

  public get knownTitles(): string[] {
    return this._knownTitles();
  }

  public get shakyTitles(): string[] {
    return this._titlesWithLevel('shaky').slice(0, 20);
  }

  public get scoreText(): string {
    return `${this.firstTryCorrectCount} of ${this.questionCount} right on the first try`;
  }

  public get progressSteps(): number[] {
    return Array.from({ length: this.questionCount }, (_: unknown, index: number) => index);
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

  public onShowHint(): void {
    this.isHintShown = true;
  }

  public onShowMe(): void {
    if (this.isQuestionDone && !this.isAnswerRevealed) {
      return;
    }

    this._loseFirstTry();
    this.isAnswerRevealed = true;
    this.isQuestionDone = true;
  }

  public onPickChoice(choice: ILessonChoice): void {
    if (this.isQuestionDone || this.triedChoices.includes(choice)) {
      return;
    }

    this.triedChoices = [...this.triedChoices, choice];

    if (choice.isCorrect) {
      this.isQuestionDone = true;
      this._scoreIfFirstTry();

      return;
    }

    this._loseFirstTry();
  }

  public onCheckBlank(): void {
    const question: ILessonQuestion | null = this.currentQuestion;

    if (!question || !this.canCheckBlank) {
      return;
    }

    if (LessonHelper.isBlankCorrect(question, this.blankText)) {
      this.isQuestionDone = true;
      this._scoreIfFirstTry();

      return;
    }

    this._loseFirstTry();
    this.blankMisses++;
    this.isHintShown = true;
    this._shakeBlank();

    if (this.blankMisses >= ConceptPanelComponent._maxBlankMisses) {
      this.isAnswerRevealed = true;
      this.isQuestionDone = true;
    }
  }

  public choiceState(choice: ILessonChoice): 'idle' | 'wrong' | 'correct' | 'locked' {
    if (this.triedChoices.includes(choice)) {
      return choice.isCorrect ? 'correct' : 'wrong';
    }

    return this.isQuestionDone ? 'locked' : 'idle';
  }

  public get isBlankSolved(): boolean {
    return this.isQuestionDone && !this.isAnswerRevealed;
  }

  public onToggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
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
    this.isLessonFinished = false;
    this.isChatOpen = false;
    this.firstTryCorrectCount = 0;
    this.errorMessage = '';
    this._resetQuestionState();
  }

  private _resetQuestionState(): void {
    this.options = [];
    this.triedChoices = [];
    this.blankText = '';
    this.blankMisses = 0;
    this.isBlankShaking = false;
    this.isHintShown = false;
    this.isQuestionDone = false;
    this.isAnswerRevealed = false;
    this._isFirstTryLost = false;
  }

  private _presentQuestion(): void {
    const question: ILessonQuestion | null = this.currentQuestion;

    this._resetQuestionState();

    if (question && question.kind === 'choice') {
      this.options = LessonHelper.shuffledChoices(question);
    }
  }

  private _loseFirstTry(): void {
    this._isFirstTryLost = true;
  }

  private _scoreIfFirstTry(): void {
    if (!this._isFirstTryLost) {
      this.firstTryCorrectCount++;
    }
  }

  private _shakeBlank(): void {
    this.isBlankShaking = true;
    setTimeout((): void => {
      this.isBlankShaking = false;
    }, 400);
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
      return (
        seeded ??
        LessonHelper.localLesson(
          this.map,
          this.concept,
          GraphHelper.allPrerequisitesOf(this.map, this.concept.id).filter(
            (item: IConcept) => GraphHelper.masteryOf(item, this.mastery) === 'known',
          ),
        )
      );
    }
  }
}
