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

/** Max chars for transcript / composer injection from tools (SSE + voice payloads). */
export const DIVINE_TRANSCRIPT_MAX = 8000
export const DIVINE_COMPOSER_MEDIA_MAX = 12

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
  /** Copyable text above the voice pill (drafts, tool output). */
  | { type: 'show_divine_transcript'; text: string; title?: string }
  /** Fill the active DM composer for this fan (Creatix UI only until send). */
  | {
      type: 'set_dm_composer'
      fanId: string
      text: string
      replace?: boolean
      mediaIds?: string[]
      price?: number | null
      /** Default true: type into the composer with a visible animation. False = instant fill. */
      animateTyping?: boolean
    }
  /** Start countdown then auto-send via registered composer bridge (0 = composer only). */
  | { type: 'schedule_dm_send'; fanId: string; delayMs: number }
  | { type: 'cancel_scheduled_dm' }
  /** Switch active tab in multi-fan DM overlay. */
  | { type: 'switch_overlay_fan'; fanId: string }

export type ApplyDivineUiOptions = {
  onShowDmReplySuggestions?: (payload: DmSuggestionBridgePayload) => void
  /** When focus_fan uses presentation overlay, open floating DM instead of navigating. */
  onFocusFanOverlay?: (fanId: string) => void
  /** When set, skip duplicate focus_fan for the same id (avoids navigation loops / React churn). */
  currentFocusedFanId?: string | null
  onShowDivineTranscript?: (payload: { text: string; title?: string }) => void
  onSetDmComposer?: (payload: {
    fanId: string
    text: string
    replace?: boolean
    mediaIds?: string[]
    price?: number | null
    animateTyping?: boolean
  }) => void
  onScheduleDmSend?: (payload: { fanId: string; delayMs: number }) => void
  onCancelScheduledDm?: () => void
  onSwitchOverlayFan?: (fanId: string) => void
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

function sanitizeTranscriptText(raw: string): string {
  return typeof raw === 'string' ? raw.replace(/\u0000/g, '').trim().slice(0, DIVINE_TRANSCRIPT_MAX) : ''
}

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
        } else if (a.presentation !== 'overlay') {
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
    if (a.type === 'show_divine_transcript' && options?.onShowDivineTranscript) {
      const text = sanitizeTranscriptText(a.text)
      if (text) {
        options.onShowDivineTranscript({
          text,
          title: typeof a.title === 'string' ? a.title.slice(0, 120) : undefined,
        })
      }
    }
    if (a.type === 'set_dm_composer' && options?.onSetDmComposer) {
      const fanId = String(a.fanId ?? '').trim()
      if (!FAN_ID_RE.test(fanId)) continue
      const text = sanitizeTranscriptText(a.text)
      const mediaIds = Array.isArray(a.mediaIds)
        ? a.mediaIds.map((x) => String(x)).filter(Boolean).slice(0, DIVINE_COMPOSER_MEDIA_MAX)
        : undefined
      const price = typeof a.price === 'number' && !Number.isNaN(a.price) ? a.price : a.price === null ? null : undefined
      options.onSetDmComposer({
        fanId,
        text,
        replace: a.replace !== false,
        mediaIds,
        price,
        animateTyping: a.animateTyping !== false,
      })
    }
    if (a.type === 'schedule_dm_send' && options?.onScheduleDmSend) {
      const fanId = String(a.fanId ?? '').trim()
      if (!FAN_ID_RE.test(fanId)) continue
      const delayMs = Math.max(0, Math.min(120_000, Math.floor(Number(a.delayMs) || 0)))
      options.onScheduleDmSend({ fanId, delayMs })
    }
    if (a.type === 'cancel_scheduled_dm' && options?.onCancelScheduledDm) {
      options.onCancelScheduledDm()
    }
    if (a.type === 'switch_overlay_fan' && options?.onSwitchOverlayFan) {
      const fanId = String(a.fanId ?? '').trim()
      if (FAN_ID_RE.test(fanId)) options.onSwitchOverlayFan(fanId)
    }
  }
}
