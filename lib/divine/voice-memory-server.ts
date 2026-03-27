import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type DivineVoiceMemoryPayload,
  type DivineVoiceNavigation,
  type DivineVoiceTask,
  VOICE_MEMORY_ACTION_LOG_MAX,
  VOICE_MEMORY_TASKS_MAX,
} from '@/lib/divine/voice-memory-types'

export async function getVoiceMemoryPayload(
  supabase: SupabaseClient,
  userId: string,
): Promise<DivineVoiceMemoryPayload> {
  const { data: row } = await supabase
    .from('profiles')
    .select('divine_voice_memory')
    .eq('id', userId)
    .maybeSingle()
  return (row?.divine_voice_memory ?? {}) as DivineVoiceMemoryPayload
}

export async function saveVoiceMemoryPayload(
  supabase: SupabaseClient,
  userId: string,
  memory: DivineVoiceMemoryPayload,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('profiles')
    .update({ divine_voice_memory: memory as Record<string, unknown> })
    .eq('id', userId)
  return error ? { error: error.message } : {}
}

/** Upsert tasks by id; cap list length. */
export function mergeTasks(prev: DivineVoiceTask[] | undefined, incoming: DivineVoiceTask[]): DivineVoiceTask[] {
  const map = new Map<string, DivineVoiceTask>()
  for (const t of prev ?? []) {
    map.set(t.id, t)
  }
  for (const t of incoming) {
    map.set(t.id, t)
  }
  return [...map.values()].slice(-VOICE_MEMORY_TASKS_MAX)
}

export function mergeNavigation(
  prev: DivineVoiceNavigation | null | undefined,
  patch: DivineVoiceNavigation | null | undefined,
): DivineVoiceNavigation | null {
  if (patch === null) return null
  if (!patch) return prev ?? null
  return {
    when: patch.when,
    taskIds: [...new Set([...(prev?.taskIds ?? []), ...patch.taskIds])],
    targetFanId: patch.targetFanId || prev?.targetFanId || '',
    highlightPanel: patch.highlightPanel ?? prev?.highlightPanel ?? null,
  }
}

export async function patchVoiceMemory(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<DivineVoiceMemoryPayload> & {
    tasksUpsert?: DivineVoiceTask[]
    navigationPatch?: DivineVoiceNavigation | null
  },
): Promise<{ memory: DivineVoiceMemoryPayload; error?: string }> {
  const prev = await getVoiceMemoryPayload(supabase, userId)
  const next: DivineVoiceMemoryPayload = { ...prev, last_updated_at: new Date().toISOString() }

  if (patch.tasksUpsert?.length) {
    next.tasks = mergeTasks(prev.tasks, patch.tasksUpsert)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'navigationPatch')) {
    next.navigation = mergeNavigation(prev.navigation ?? null, patch.navigationPatch ?? undefined)
  }
  if (patch.tasks !== undefined) next.tasks = patch.tasks
  if (patch.navigation !== undefined) next.navigation = patch.navigation
  if (patch.status !== undefined) next.status = patch.status
  if (patch.resume_hint !== undefined) next.resume_hint = patch.resume_hint
  if (patch.action_log?.length) {
    const log = [...(prev.action_log ?? []), ...patch.action_log]
    next.action_log = log.slice(-VOICE_MEMORY_ACTION_LOG_MAX)
  }

  const err = await saveVoiceMemoryPayload(supabase, userId, next)
  if (err.error) return { memory: prev, error: err.error }
  return { memory: next }
}
