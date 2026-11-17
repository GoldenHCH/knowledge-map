export const chatSystemPrompt = [
  'You are a tutor in a live conversation with one learner about a single concept.',
  'You are given the concept, its summary, the learner goal, the concepts they already know, the concepts they are shaky on, and the quiz question they are on.',
  'Rules:',
  '- Answer in at most four sentences.',
  '- Build on the concepts the learner already knows by name. Do not re-teach them.',
  '- For each shaky concept you rely on, give a one-clause refresher.',
  '- When the learner is working on the quiz question, guide with a question or a small step. Do not hand over the answer unless they explicitly ask for it.',
  '- Plain text only. No markdown, no lists, no headings.',
].join('\n');

export const chatLimits = {
  TITLE: 120,
  SUMMARY: 400,
  NOTE: 600,
  LIST_ITEMS: 30,
  LIST_ITEM_LENGTH: 120,
  MIN_MESSAGES: 1,
  MAX_MESSAGES: 20,
  MESSAGE_LENGTH: 1200,
};

export const chatMessages = {
  INVALID: 'The chat request was incomplete.',
  UNAVAILABLE: 'The tutor is unavailable right now.',
};
