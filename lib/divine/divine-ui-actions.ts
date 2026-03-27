/**
 * Shared Divine UI action types + client-safe applier (no server-only imports).
 * Used by Messages bridge, voice, and divine-manager-chat SSE.
 */

const FAN_ID_RE = /^[a-z0-9_-]{1,64}$/i

/** Max strings per suggestion list; keeps SSE / voice payloads bounded. */
export const DM_SUGGESTION_LIST_CAP = 12
/** Max chars per suggestion line after trim. */
export const DM_SUGGESTION_LINE_MAX = 4000

export type DmScanInsights = {
  insights: string[]
  riskFlags: string[]
  suggestedAngles: string[]
}

export type DmSuggestionBridgePayload = {
  fanId: string
  scan: DmScanInsights | null
  circeSuggestions: string[]
  venusSuggestions: string[]
  flirtSuggestions: string[]
  highlightPanel: 'circe' | 'venus' | 'flirt' | null
  recommendation?: 'circe' | 'venus' | 'flirt' | null
  recommendationReason?: string | null
}

export type DivineUiAction =
  | { type: 'navigate'; path: string }
  | {
      type: 'focus_fan'
      fanId: string
      /** Default navigate: open Messages route. overlay: floating DM panel (see dm_focus_mode). */
      presentation?: 'navigate' | 'overlay'
    }
  /** Voice client only: allow manual End call when policy is after_closing_prompt. */
  | { type: 'voice_set_hangup'; allowed: boolean }
  | {
      type: 'show_dm_reply_suggestions'
      fanId: string
      scan: DmScanInsights | null
      circeSuggestions: string[]
      venusSuggestions: string[]
      flirtSuggestions: string[]
      highlightPanel: 'circe' | 'venus' | 'flirt' | null
      recommendation?: 'circe' | 'venus' | 'flirt' | null
      recommendationReason?: string | null
    }

export type ApplyDivineUiOptions = {
  onShowDmReplySuggestions?: (payload: DmSuggestionBridgePayload) => void
  /** When focus_fan uses presentation overlay, open floating DM instead of navigating. */
  onFocusFanOverlay?: (fanId: string) => void
  /** When set, skip duplicate focus_fan for the same id (avoids navigation loops / React churn). */
  currentFocusedFanId?: string | null
}

function capStringList(lines: string[], cap: number, lineMax: number): string[] {
  return lines
    .slice(0, cap)
    .map((s) => (typeof s === 'string' ? s.trim().slice(0, lineMax) : ''))
    .filter(Boolean)
}

export function normalizeScanForUi(scan: unknown): DmScanInsights | null {
  if (!scan || typeof scan !== 'object') return null
  const o = scan as Record<string, unknown>
  const insights = Array.isArray(o.insights) ? o.insights.map((x) => String(x)) : []
  const riskFlags = Array.isArray(o.riskFlags) ? o.riskFlags.map((x) => String(x)) : []
  const suggestedAngles = Array.isArray(o.suggestedAngles) ? o.suggestedAngles.map((x) => String(x)) : []
  if (!insights.length && !riskFlags.length && !suggestedAngles.length) return null
  return {
    insights: capStringList(insights, 24, DM_SUGGESTION_LINE_MAX),
    riskFlags: capStringList(riskFlags, 24, DM_SUGGESTION_LINE_MAX),
    suggestedAngles: capStringList(suggestedAngles, 24, DM_SUGGESTION_LINE_MAX),
  }
}

function sanitizeDmShowAction(a: Extract<DivineUiAction, { type: 'show_dm_reply_suggestions' }>): DmSuggestionBridgePayload | null {
  const fanId = typeof a.fanId === 'string' ? a.fanId.trim() : ''
  if (!FAN_ID_RE.test(fanId)) return null
  const scan = normalizeScanForUi(a.scan)
  return {
    fanId,
    scan,
    circeSuggestions: capStringList(a.circeSuggestions ?? [], DM_SUGGESTION_LIST_CAP, DM_SUGGESTION_LINE_MAX),
    venusSuggestions: capStringList(a.venusSuggestions ?? [], DM_SUGGESTION_LIST_CAP, DM_SUGGESTION_LINE_MAX),
    flirtSuggestions: capStringList(a.flirtSuggestions ?? [], DM_SUGGESTION_LIST_CAP, DM_SUGGESTION_LINE_MAX),
    highlightPanel:
      a.highlightPanel === 'circe' || a.highlightPanel === 'venus' || a.highlightPanel === 'flirt'
        ? a.highlightPanel
        : null,
    recommendation:
      a.recommendation === 'circe' || a.recommendation === 'venus' || a.recommendation === 'flirt'
        ? a.recommendation
        : a.recommendation === null
          ? null
          : undefined,
    recommendationReason:
      typeof a.recommendationReason === 'string' ? a.recommendationReason.slice(0, 500) : a.recommendationReason ?? undefined,
  }
}

type RouterLike = { push: (path: string) => void }

export type FocusedFanInput = { id: string; username?: string | null; name?: string | null }

export function applyDivineUiActions(
  actions: DivineUiAction[] | undefined,
  router: RouterLike,
  setFocusedFan: (fan: FocusedFanInput | null) => void,
  options?: ApplyDivineUiOptions,
) {
  if (!actions?.length) return
  const onDm = options?.onShowDmReplySuggestions
  for (const a of actions) {
    if (a.type === 'voice_set_hangup') {
      continue
    }
    if (a.type === 'navigate' && a.path.startsWith('/dashboard')) {
      router.push(a.path)
    }
    if (a.type === 'focus_fan' && a.fanId) {
      const id = String(a.fanId).trim()
      if (FAN_ID_RE.test(id)) {
        const alreadyFocused =
          options?.currentFocusedFanId != null && options.currentFocusedFanId === id
        if (!alreadyFocused) {
          setFocusedFan({ id })
        }
        if (a.presentation === 'overlay' && options?.onFocusFanOverlay) {
          options.onFocusFanOverlay(id)
        } else {
          // Plain /dashboard/messages (no ?fanId=): Messages selects the thread from focusedFan
          // after conversations load—same as picking a chat in the list. Avoids client crashes seen
          // with deep-link query + searchParams on some navigations.
          router.push('/dashboard/messages')
        }
      }
    }
    if (a.type === 'show_dm_reply_suggestions' && onDm) {
      const payload = sanitizeDmShowAction(a)
      if (payload) onDm(payload)
    }
  }
}
