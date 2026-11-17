export interface ITutorChatMessage {
  role: 'learner' | 'tutor';
  text: string;
}

export interface ITutorChatRequest {
  conceptTitle: string;
  conceptSummary: string;
  goalTitle: string;
  knownTitles: string[];
  shakyTitles: string[];
  contextNote: string;
  messages: ITutorChatMessage[];
}
