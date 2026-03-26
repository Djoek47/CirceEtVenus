export type DivineVoiceMemoryStatus = 'idle' | 'in_progress' | 'completed'

export type DivineVoiceDisconnectReason =
  | 'idle_timeout'
  | 'user_hangup'
  | 'end_call'
  | 'error'
  | null

export type DivineVoiceMemoryAction = {
  tool: string
  summary: string
  at: string
}

export type DivineVoiceMemoryPayload = {
  status?: DivineVoiceMemoryStatus
  disconnect_reason?: DivineVoiceDisconnectReason
  last_updated_at?: string
  action_log?: DivineVoiceMemoryAction[]
  resume_hint?: string
  pending_confirmations?: Array<{ type: string; intent_id: string; summary?: string }>
}

export const VOICE_MEMORY_ACTION_LOG_MAX = 15
