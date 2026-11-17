import { IConcept, IKnowledgeMap, ILesson, ILessonChoice, ILessonQuestion } from './knowledge-map.interfaces';

export class LessonHelper {
  private static readonly _numberTolerance: number = 0.001;
  private static readonly _wrongChoiceCount: number = 3;

  public static isBlankCorrect(question: ILessonQuestion, answer: string): boolean {
    const given: string = LessonHelper._normalise(answer);

    if (given.length === 0) {
      return false;
    }

    return question.acceptedAnswers.some((accepted: string) => LessonHelper._isSameValue(given, LessonHelper._normalise(accepted)));
  }

  public static shuffledChoices(question: ILessonQuestion): ILessonChoice[] {
    return LessonHelper._shuffled(question.choices);
  }

  public static localLesson(map: IKnowledgeMap, concept: IConcept, knownPrerequisites: IConcept[]): ILesson {
    const directPrerequisites: IConcept[] = concept.prerequisiteIds
      .map((id: string) => map.concepts.find((item: IConcept) => item.id === id))
      .filter((item: IConcept | undefined): item is IConcept => item !== undefined);
    const others: IConcept[] = map.concepts.filter((item: IConcept) => item.id !== concept.id);
    const dependents: IConcept[] = others.filter((item: IConcept) => item.prerequisiteIds.includes(concept.id));
    const knownTitles: string[] = knownPrerequisites.map((item: IConcept) => item.title);
    const anchorTitle: string = knownTitles[0] ?? directPrerequisites[0]?.title ?? 'Everyday experience';
    const describes: ILessonQuestion = LessonHelper._describesQuestion(concept, others, anchorTitle);
    const first: ILessonQuestion =
      directPrerequisites.length > 0
        ? LessonHelper._buildsOnQuestion(concept, directPrerequisites, others, anchorTitle)
        : describes;
    const third: ILessonQuestion =
      dependents.length > 0
        ? LessonHelper._prerequisiteForQuestion(concept, dependents, anchorTitle)
        : LessonHelper._comesBeforeQuestion(concept, directPrerequisites, others, anchorTitle);

    return {
      conceptTitle: concept.title,
      isGenerated: false,
      opening:
        knownTitles.length > 0
          ? `You already know ${knownTitles.join(', ')}. This short quiz builds ${concept.title} on top of that.`
          : `Let's check what ${concept.title} is and where it sits on your map.`,
      questions: [first, describes, third],
      takeaway: concept.summary,
    };
  }

  private static _buildsOnQuestion(
    concept: IConcept,
    prerequisites: IConcept[],
    others: IConcept[],
    anchorTitle: string,
  ): ILessonQuestion {
    const correct: IConcept = prerequisites[0];
    const wrong: IConcept[] = LessonHelper._pick(
      others.filter((item: IConcept) => !prerequisites.some((prerequisite: IConcept) => prerequisite.id === item.id)),
    );

    return LessonHelper._choiceQuestion({
      prompt: `Which of these does ${concept.title} build on directly?`,
      anchorTitle,
      correctText: correct.title,
      wrongTexts: wrong.map((item: IConcept) => item.title),
      correctFeedback: `${concept.title} builds directly on ${correct.title}.`,
      wrongFeedback: (text: string): string => `${text} is not one of the concepts ${concept.title} is built on.`,
      hint: `Look at what comes right before ${concept.title} on the map.`,
      reasoning: `${concept.title} builds directly on ${correct.title}. ${concept.summary}`,
    });
  }

  private static _describesQuestion(concept: IConcept, others: IConcept[], anchorTitle: string): ILessonQuestion {
    const wrong: IConcept[] = LessonHelper._pick(others.filter((item: IConcept) => item.summary.length > 0));

    return LessonHelper._choiceQuestion({
      prompt: `Which statement describes ${concept.title}?`,
      anchorTitle,
      correctText: concept.summary,
      wrongTexts: wrong.map((item: IConcept) => item.summary),
      correctFeedback: 'That is how the map describes it.',
      wrongFeedback: (): string => `That describes a different concept, not ${concept.title}.`,
      hint: `Think about what ${concept.title} is for.`,
      reasoning: concept.summary,
    });
  }

  private static _comesBeforeQuestion(
    concept: IConcept,
    prerequisites: IConcept[],
    others: IConcept[],
    anchorTitle: string,
  ): ILessonQuestion {
    if (prerequisites.length === 0) {
      return LessonHelper._describesQuestion(concept, others, anchorTitle);
    }

    const correct: IConcept = prerequisites[prerequisites.length - 1];
    const wrong: IConcept[] = LessonHelper._pick(
      others.filter((item: IConcept) => !prerequisites.some((prerequisite: IConcept) => prerequisite.id === item.id)),
    );

    return LessonHelper._choiceQuestion({
      prompt: `Which concept comes right before ${concept.title}?`,
      anchorTitle,
      correctText: correct.title,
      wrongTexts: wrong.map((item: IConcept) => item.title),
      correctFeedback: `${correct.title} is a prerequisite of ${concept.title}.`,
      wrongFeedback: (text: string): string => `${text} is not a prerequisite of ${concept.title}.`,
      hint: `Check the concepts ${concept.title} builds on.`,
      reasoning: `${concept.title} builds on ${correct.title}. ${concept.summary}`,
    });
  }

  private static _prerequisiteForQuestion(concept: IConcept, dependents: IConcept[], anchorTitle: string): ILessonQuestion {
    return {
      kind: 'blank',
      prompt: `${concept.title} is a prerequisite for ___.`,
      buildsOnTitle: anchorTitle,
      choices: [],
      acceptedAnswers: dependents.map((item: IConcept) => item.title),
      hint: `Think about which concept needs ${concept.title} before you can learn it.`,
      reasoning: `${dependents[0].title} lists ${concept.title} as a prerequisite. ${concept.summary}`,
    };
  }

  private static _choiceQuestion(spec: {
    prompt: string;
    anchorTitle: string;
    correctText: string;
    wrongTexts: string[];
    correctFeedback: string;
    wrongFeedback: (text: string) => string;
    hint: string;
    reasoning: string;
  }): ILessonQuestion {
    const choices: ILessonChoice[] = [
      ...spec.wrongTexts.map((text: string): ILessonChoice => ({ text, isCorrect: false, feedback: spec.wrongFeedback(text) })),
    ];
    const position: number = Math.floor(Math.random() * (choices.length + 1));

    choices.splice(position, 0, { text: spec.correctText, isCorrect: true, feedback: spec.correctFeedback });

    return {
      kind: 'choice',
      prompt: spec.prompt,
      buildsOnTitle: spec.anchorTitle,
      choices,
      acceptedAnswers: [],
      hint: spec.hint,
      reasoning: spec.reasoning,
    };
  }

  private static _pick(candidates: IConcept[]): IConcept[] {
    return LessonHelper._shuffled(candidates).slice(0, LessonHelper._wrongChoiceCount);
  }

  private static _shuffled<T>(items: T[]): T[] {
    const copy: T[] = [...items];

    for (let index: number = copy.length - 1; index > 0; index--) {
      const swapIndex: number = Math.floor(Math.random() * (index + 1));
      const held: T = copy[index];

      copy[index] = copy[swapIndex];
      copy[swapIndex] = held;
    }

    return copy;
  }

  private static _normalise(value: string): string {
    let text: string = value.trim().toLowerCase().replace(/\s+/g, ' ');

    text = text.replace(/\.$/, '').trim();
    text = text.replace(/^["'“‘]+|["'”’]+$/g, '').trim();

    return text;
  }

  private static _isSameValue(first: string, second: string): boolean {
    if (first === second) {
      return true;
    }

    const firstNumber: number = Number(first);
    const secondNumber: number = Number(second);

    if (first.length === 0 || second.length === 0 || Number.isNaN(firstNumber) || Number.isNaN(secondNumber)) {
      return false;
    }

    return Math.abs(firstNumber - secondNumber) < LessonHelper._numberTolerance;
  }
}
