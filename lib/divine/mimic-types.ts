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

export function parseMimicProfile(raw: unknown): MimicProfileV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1) return null
  return {
    ...DEFAULT_MIMIC_PROFILE,
    ...(o as Partial<MimicProfileV1>),
    version: 1,
  }
}
