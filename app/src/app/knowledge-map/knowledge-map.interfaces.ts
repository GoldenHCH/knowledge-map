import { LessonQuestionKind, MasteryLevel } from './knowledge-map.types';

export interface IConcept {
  id: string;
  title: string;
  summary: string;
  prerequisiteIds: string[];
}

export interface ISampleLearner {
  knownConceptIds: string[];
  shakyConceptIds: string[];
}

export interface IKnowledgeMap {
  id: string;
  title: string;
  description: string;
  goalConceptId: string;
  concepts: IConcept[];
  isGenerated: boolean;
  sampleLearner?: ISampleLearner;
}

export interface IPositionedConcept {
  concept: IConcept;
  x: number;
  y: number;
  depth: number;
  titleLines: string[];
}

export interface IMapEdge {
  fromConceptId: string;
  toConceptId: string;
  svgPath: string;
}

export interface IMapLayout {
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  nodes: IPositionedConcept[];
  edges: IMapEdge[];
}

export interface ILearningPath {
  goal: IConcept;
  steps: IConcept[];
  skipped: IConcept[];
  nextStep: IConcept | null;
}

export interface ILessonChoice {
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface ILessonQuestion {
  kind: LessonQuestionKind;
  prompt: string;
  buildsOnTitle: string;
  choices: ILessonChoice[];
  acceptedAnswers: string[];
  hint: string;
  reasoning: string;
}

export interface ILesson {
  conceptTitle: string;
  opening: string;
  questions: ILessonQuestion[];
  takeaway: string;
  isGenerated: boolean;
}

export interface ILessonRequest {
  goalTitle: string;
  conceptTitle: string;
  conceptSummary: string;
  knownTitles: string[];
  shakyTitles: string[];
  missingTitles: string[];
}

export interface ITranscriptFinding {
  title: string;
  level: MasteryLevel;
  reason: string;
}

export interface ITranscriptRequest {
  transcript: string;
  concepts: { title: string; summary: string }[];
}

export interface ISampleTranscript {
  id: string;
  label: string;
  text: string;
}

export interface ISignupRequest {
  email: string;
  goal: string;
}

export interface ILessonVideo {
  src: string;
  poster: string;
  caption: string;
}
