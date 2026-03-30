/**
 * Mimic Test profile stored in divine_manager_settings.mimic_profile (JSONB).
 */
export type MimicProfileV1 = {
  version: 1
  /** Wizard progress (step indices completed). */
  completedSteps?: number[]
  /** Allow Divine to draft fan-facing text (still subject to neverSendWithoutReview). */
  consentFanFacingDrafts?: boolean
  /** Default true: drafts only; user sends manually unless they change policy elsewhere. */
  neverSendWithoutReview?: boolean
  toneWarmth?: number
  flirtCeiling?: number
  humorLevel?: number
  /** 0 = none, 1 = rare typo, 2 = occasional, 3 = more casual typos (bounded) */
  humanizationLevel?: number
  tabooTopics?: string[]
  bannedPhrases?: string[]
  signaturePhrases?: string[]
  /** Short pasted examples of the creator's own writing (max length enforced in UI). */
  exemplarReplies?: string[]
  escalateOnKeywords?: string[]
  escalateFirstTimeDm?: boolean
  escalateWhale?: boolean
  notes?: string
  updatedAt?: string
  /** Short LLM summary of the last AI tune session */
  aiInterviewSummary?: string
  /** ISO timestamp of last AI interview apply */
  aiInterviewAt?: string
  /** Scripted Q&A or chat turns used for tuning */
  interviewTranscript?: { q: string; a: string }[]
}

export const DEFAULT_MIMIC_PROFILE: MimicProfileV1 = {
  version: 1,
  consentFanFacingDrafts: false,
  neverSendWithoutReview: true,
  toneWarmth: 3,
  flirtCeiling: 2,
  humorLevel: 2,
  humanizationLevel: 1,
  tabooTopics: [],
  bannedPhrases: [],
  signaturePhrases: [],
  exemplarReplies: [],
  escalateOnKeywords: [],
  escalateFirstTimeDm: true,
  escalateWhale: true,
}

function parseInterviewTranscript(raw: unknown): { q: string; a: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: { q: string; a: string }[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const q = typeof r.q === 'string' ? r.q : typeof r.question === 'string' ? r.question : ''
    const a = typeof r.a === 'string' ? r.a : typeof r.answer === 'string' ? r.answer : ''
    if (!q && !a) continue
    out.push({ q: q.slice(0, 2000), a: a.slice(0, 2000) })
    if (out.length >= 40) break
  }
  return out.length ? out : undefined
}

export function parseMimicProfile(raw: unknown): MimicProfileV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1) return null
  const base = {
    ...DEFAULT_MIMIC_PROFILE,
    ...(o as Partial<MimicProfileV1>),
    version: 1 as const,
  }
  return {
    ...base,
    aiInterviewSummary:
      typeof o.aiInterviewSummary === 'string' ? o.aiInterviewSummary.slice(0, 8000) : base.aiInterviewSummary,
    aiInterviewAt: typeof o.aiInterviewAt === 'string' ? o.aiInterviewAt.slice(0, 40) : base.aiInterviewAt,
    interviewTranscript: parseInterviewTranscript(o.interviewTranscript) ?? base.interviewTranscript,
  }
}
