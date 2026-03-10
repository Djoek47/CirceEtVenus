// Lightweight safety/examples file for manual testing of message suggestion helpers.
// This is not wired into any runtime path but documents scenarios to validate:
//
// - Pro user with XAI_API_KEY: expect model === 'grok' and JSON-parsed suggestions/insights.
// - Free user or missing XAI_API_KEY: expect model === 'openai' and graceful parsing of partial JSON.
// - Empty or extremely short conversations: API should return 200 with empty suggestions and no crash.
// - Timeouts or 5xx from Grok/OpenAI: helpers must catch and return a minimal result instead of throwing.

import type { SuggestionRequestContext } from './message-suggestions'

export const exampleScanContext: SuggestionRequestContext = {
  mode: 'scan',
  platform: 'onlyfans',
  fan: { id: 'fan-1', username: 'diamond_lover', name: 'Diamond Lover' },
  messages: [
    { from: 'fan', text: 'Your last set was incredible, I keep rewatching it.', createdAt: new Date().toISOString() },
    { from: 'creator', text: 'I love that you enjoyed it, what did you like most?', createdAt: new Date().toISOString() },
  ],
}

