// AsyncStorage keys
export const STORAGE_KEYS = {
  HISTORY: '@nightpulse:history',
  CHANNELS: '@nightpulse:channels',
  QUEUE: '@nightpulse:queue',
  ONBOARDING: '@nightpulse:onboarding',
} as const;

// SecureStore keys (only alphanumeric, ".", "-", "_" allowed)
export const SECURE_KEYS = {
  GMAIL_TOKENS: 'nightpulse.gmail_tokens',
  TELEGRAM_BOT: 'nightpulse.telegram_bot',
} as const;
