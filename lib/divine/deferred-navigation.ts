import type { DivineVoiceMemoryPayload } from '@/lib/divine/voice-memory-types'
import type { DivineUiAction, DmScanInsights } from '@/lib/divine/divine-ui-actions'

/**
 * When every task in memory.navigation.taskIds is done and the DM scan task has resultPayload,
 * build UI actions to open Messages with suggestions (same as sync get_reply_suggestions).
 */
export function buildDeferredNavigationActions(mem: DivineVoiceMemoryPayload): DivineUiAction[] | null {
  const nav = mem.navigation
  if (!nav || nav.when !== 'all_tasks_complete' || !nav.taskIds?.length || !nav.targetFanId) return null
  const tasks = mem.tasks ?? []
  const byId = new Map(tasks.map((t) => [t.id, t]))
  for (const id of nav.taskIds) {
    const t = byId.get(id)
    if (!t || t.status !== 'done') return null
  }
  const scanTask = tasks.find((t) => t.kind === 'dm_thread_scan' && t.status === 'done')
  const raw = scanTask?.resultPayload
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const fanId = String(p.fanId ?? nav.targetFanId)
  const scan = (p.scan as DmScanInsights | null) ?? null
  const circe = Array.isArray(p.circeSuggestions) ? (p.circeSuggestions as string[]) : []
  const venus = Array.isArray(p.venusSuggestions) ? (p.venusSuggestions as string[]) : []
  const flirt = Array.isArray(p.flirtSuggestions) ? (p.flirtSuggestions as string[]) : []
  const hp = p.highlightPanel
  const highlightPanel =
    hp === 'circe' || hp === 'venus' || hp === 'flirt' ? hp : nav.highlightPanel ?? null
  const actions: DivineUiAction[] = [
    { type: 'focus_fan', fanId },
    {
      type: 'show_dm_reply_suggestions',
      fanId,
      scan,
      circeSuggestions: circe,
      venusSuggestions: venus,
      flirtSuggestions: flirt,
      highlightPanel,
      recommendation:
        p.recommendation === 'circe' || p.recommendation === 'venus' || p.recommendation === 'flirt'
          ? p.recommendation
          : undefined,
      recommendationReason: typeof p.recommendationReason === 'string' ? p.recommendationReason : undefined,
    },
  ]
  return actions
}

export function hasPendingBarrierTasks(mem: DivineVoiceMemoryPayload): boolean {
  const nav = mem.navigation
  if (!nav?.taskIds?.length) return false
  const tasks = mem.tasks ?? []
  const byId = new Map(tasks.map((t) => [t.id, t]))
  for (const id of nav.taskIds) {
    const t = byId.get(id)
    if (!t || t.status === 'pending') return true
  }
  return false
}
