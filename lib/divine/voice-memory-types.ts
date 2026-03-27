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

export type DivineVoiceTaskKind = 'dm_thread_scan' | 'get_stats'

export type DivineVoiceTask = {
  id: string
  kind: DivineVoiceTaskKind
  status: 'pending' | 'done' | 'error'
  fanId?: string
  error?: string
  createdAt: string
  completedAt?: string
  /** When kind is dm_thread_scan and status is done — hydrates Messages UI */
  resultPayload?: Record<string, unknown>
}

/** When all listed tasks are done, client applies deferred navigation (e.g. back to Messages). */
export type DivineVoiceNavigation = {
  when: 'all_tasks_complete'
  taskIds: string[]
  targetFanId: string
  highlightPanel: 'circe' | 'venus' | 'flirt' | null
}

export type DivineVoiceMemoryPayload = {
  status?: DivineVoiceMemoryStatus
  disconnect_reason?: DivineVoiceDisconnectReason
  last_updated_at?: string
  action_log?: DivineVoiceMemoryAction[]
  resume_hint?: string
  pending_confirmations?: Array<{ type: string; intent_id: string; summary?: string }>
  /** Structured multitask state (voice + deferred UI). */
  tasks?: DivineVoiceTask[]
  /** Barrier: navigate when every task in taskIds is done. */
  navigation?: DivineVoiceNavigation | null
}

export const VOICE_MEMORY_ACTION_LOG_MAX = 15
export const VOICE_MEMORY_TASKS_MAX = 12
