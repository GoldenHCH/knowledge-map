export type MasteryLevel = 'new' | 'shaky' | 'known';

export type MasteryByConceptKey = Record<string, MasteryLevel>;

export type LessonQuestionKind = 'choice' | 'blank';
