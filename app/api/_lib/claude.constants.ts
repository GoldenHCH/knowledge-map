export const claudeModels = {
  DEFAULT: process.env['GAPMAP_CLAUDE_MODEL'] ?? 'claude-opus-5-5',
};

export const claudeEffort = {
  JSON: 'low',
  CHAT: 'low',
} as const;

export const claudeFallbackModels: string[] = [
  'claude-fable-5-2',
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
];

export const claudeFallbackBeta = 'server-side-fallback-2026-07-01';

export const claudeLimits = {
  MIN_JSON_TOKENS: 16000,
  CHAT_TOKENS: 4000,
};
